import 'server-only';
import { TZDate } from '@date-fns/tz';
import { addMonths, startOfMonth, subMonths } from 'date-fns';
import { db } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { dayKey } from '@/lib/format';
import { can } from '@/lib/permissions';
import { requestNow } from '@/lib/time-zone';
import { listUnbilledTime } from '@/server/invoices';
import { requireMembership } from '@/server/organizations';
import { getWorkspaceSettings } from '@/server/settings';

// The dashboard's numbers, all computed by the database (SUM / COUNT / GROUP BY) instead of
// loading rows into JavaScript. Months are the user's calendar months, like everywhere else.
//
// Money: owners and admins only (the `invoice` permission). Members see their own hours.
// Totals are in the workspace's currency; invoices in an older currency are left out (and the
// page says so), because adding euros to dollars would be meaningless.

export const REVENUE_MONTHS = 12;

/**
 * A Date as a Postgres `timestamp` literal in UTC (our columns are UTC without a zone).
 * `new Date(...)` first: a TZDate's toISOString() is in its own zone ("...T00:00:00.000-04:00").
 */
const sqlTimestamp = (date: Date) =>
   new Date(date.getTime()).toISOString().slice(0, 23).replace('T', ' ');

export async function getDashboard(orgSlug: string, timeZone: string) {
   const { session, organization, role } = await requireMembership(orgSlug);
   const finances = can(role, { invoice: ['read'] });

   // This month and the 11 before it, as [start, end) in the user's time zone. date-fns does the
   // calendar maths (months have different lengths, daylight saving moves midnight).
   const thisMonth = startOfMonth(new TZDate(requestNow(), timeZone));
   const months = Array.from({ length: REVENUE_MONTHS }, (_, i) => {
      const start = subMonths(thisMonth, REVENUE_MONTHS - 1 - i);
      return { start, end: addMonths(start, 1) };
   });

   const [hours, money] = await Promise.all([
      // Everyone's time for owners/admins, your own for members.
      hoursThisMonth(organization.id, finances ? null : session.user.id, months.at(-1)!),
      finances ? moneyOverview(orgSlug, organization.id, timeZone, months) : null
   ]);
   return { organization, finances, hours, money };
}

/** Finished time started this month: the total, and per project (billable split out). */
async function hoursThisMonth(
   organizationId: string,
   userId: string | null,
   month: { start: Date; end: Date }
) {
   const where: Prisma.TimeEntryWhereInput = {
      organizationId,
      ...(userId && { userId }),
      endedAt: { not: null },
      startedAt: { gte: month.start, lt: month.end }
   };
   // SQL: SELECT "projectId", billable, SUM("durationSec") ... GROUP BY "projectId", billable
   const groups = await db.timeEntry.groupBy({
      by: ['projectId', 'billable'],
      where,
      _sum: { durationSec: true }
   });
   const projects = await db.project.findMany({
      where: { id: { in: [...new Set(groups.map((group) => group.projectId))] }, organizationId },
      select: { id: true, name: true, color: true, client: { select: { name: true } } }
   });

   const rows = new Map(
      projects.map((project) => [project.id, { project, seconds: 0, billableSeconds: 0 }])
   );
   for (const group of groups) {
      const row = rows.get(group.projectId);
      if (!row) continue;
      const seconds = group._sum.durationSec ?? 0;
      row.seconds += seconds;
      if (group.billable) row.billableSeconds += seconds;
   }
   const perProject = [...rows.values()].sort(
      (a, b) => b.seconds - a.seconds || a.project.name.localeCompare(b.project.name)
   );
   return {
      monthStart: month.start,
      totalSeconds: perProject.reduce((sum, row) => sum + row.seconds, 0),
      billableSeconds: perProject.reduce((sum, row) => sum + row.billableSeconds, 0),
      perProject
   };
}

async function moneyOverview(
   orgSlug: string,
   organizationId: string,
   timeZone: string,
   months: { start: Date; end: Date }[]
) {
   const { currency } = await getWorkspaceSettings(orgSlug);
   // Due dates are calendar dates stored at UTC midnight: overdue = due before today (the
   // user's today), the same rule as the Overdue badge.
   const today = new Date(`${dayKey(new Date(requestNow()), timeZone)}T00:00:00Z`);
   const unpaid = { organizationId, currency, status: 'SENT' } as const;

   const [outstanding, overdue, revenue, otherCurrencies, unbilled] = await Promise.all([
      db.invoice.aggregate({ where: unpaid, _sum: { totalCents: true }, _count: true }),
      db.invoice.aggregate({
         where: { ...unpaid, dueDate: { lt: today } },
         _sum: { totalCents: true },
         _count: true
      }),
      revenuePerMonth(organizationId, currency, months),
      db.invoice.groupBy({
         by: ['currency'],
         where: { organizationId, status: { in: ['SENT', 'PAID'] }, currency: { not: currency } }
      }),
      listUnbilledTime(orgSlug)
   ]);

   return {
      currency,
      outstanding: { cents: outstanding._sum.totalCents ?? 0, count: outstanding._count },
      overdue: { cents: overdue._sum.totalCents ?? 0, count: overdue._count },
      revenue,
      otherCurrencies: otherCurrencies.map((group) => group.currency),
      // What "New invoice" would bill right now (before tax), from the projects' rates.
      unbilled: {
         seconds: unbilled.reduce((sum, row) => sum + row.seconds, 0),
         cents: unbilled.reduce((sum, row) => sum + (row.amountCents ?? 0), 0),
         withoutRate: unbilled.filter((row) => row.amountCents === null).length
      }
   };
}

/**
 * Paid invoices per month (by the day they were paid), one row per month even when nothing was
 * paid. The month boundaries come from JavaScript (in the user's time zone) as a list, and
 * Postgres sums the invoices falling into each: one query, and the database never has to know
 * about time zones.
 */
async function revenuePerMonth(
   organizationId: string,
   currency: string,
   months: { start: Date; end: Date }[]
) {
   // $queryRaw is a tagged template: every ${value} becomes a query parameter ($1, $2, ...),
   // never pasted into the SQL text, so this is safe from SQL injection.
   const rows = await db.$queryRaw<{ i: number; cents: bigint; count: bigint }[]>`
      SELECT m.i, COALESCE(SUM(inv."totalCents"), 0)::bigint AS cents, COUNT(inv.id) AS count
      FROM unnest(
         ${months.map((month) => sqlTimestamp(month.start))}::timestamp[],
         ${months.map((month) => sqlTimestamp(month.end))}::timestamp[]
      ) WITH ORDINALITY AS m(start_at, end_at, i)
      LEFT JOIN invoice inv
         ON inv."organizationId" = ${organizationId}
         AND inv.status = 'PAID'
         AND inv.currency = ${currency}
         AND inv."paidAt" >= m.start_at
         AND inv."paidAt" < m.end_at
      GROUP BY m.i
      ORDER BY m.i`;
   // SUM/COUNT come back as BigInt (Postgres bigint); invoice totals fit a JS number easily.
   return rows.map((row) => ({
      month: months[Number(row.i) - 1].start,
      cents: Number(row.cents),
      count: Number(row.count)
   }));
}
