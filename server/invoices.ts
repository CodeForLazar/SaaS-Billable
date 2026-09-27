import 'server-only';
import { randomBytes } from 'node:crypto';
import { TZDate } from '@date-fns/tz';
import { addDays, subHours } from 'date-fns';
import { notFound } from 'next/navigation';
import { cache, createElement } from 'react';
import InvoiceEmail from '@/emails/invoice';
import InvoiceReminderEmail, { reminderSubject } from '@/emails/invoice-reminder';
import { db } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { dayKey, formatDate, formatDayRange } from '@/lib/format';
import { invoicePdfFilename, renderInvoicePdf } from '@/lib/invoice-pdf';
import { DATE_ONLY_ZONE } from '@/utils/invoice-status';
import { lineAmount, secondsToQuantity, taxAmount } from '@/utils/invoice-math';
import { toInvoiceView } from '@/utils/invoice-view';
import { sendEmail } from '@/lib/mailer';
import { formatMoney } from '@/utils/money';
import { can } from '@/lib/permissions';
import { getTimeZone, requestNow } from '@/lib/time-zone';
import type {
   InvoiceDetailsInput,
   InvoiceLineInput,
   InvoiceListQuery
} from '@/validations/invoice';
import { isDemoWorkspace } from '@/server/demo';
import { requireMembership } from '@/server/organizations';
import { getWorkspaceSettings } from '@/server/settings';

// Invoices are for owners and admins (the `invoice` permission). Members get the same 404 as
// someone outside the workspace: they shouldn't learn that an invoice exists.

export const INVOICES_PAGE_SIZE = 20;

type InvoiceAction = 'read' | 'create' | 'update' | 'send' | 'void' | 'delete';

/** The membership, if it may do `action` on invoices; otherwise 404. */
async function requireInvoiceAccess(orgSlug: string, action: InvoiceAction) {
   const membership = await requireMembership(orgSlug);
   if (!can(membership.role, { invoice: [action] })) notFound();
   return membership;
}

export type InvoiceResult =
   | { ok: true; invoiceId: string; orgSlug: string }
   | { ok: false; message: string; field?: 'clientId' };

const gone = { ok: false, message: 'This invoice no longer exists.' } as const;
// Demo workspaces never send email: a visitor could otherwise email any address they type in.
const demoNoEmail = {
   ok: false,
   message: 'Emails aren’t sent from the demo, so nothing went out. Everything else works.'
} as const;
const notDraft = {
   ok: false,
   message: 'This invoice has been sent, so it can no longer be changed.'
} as const;

/** Time that can go on an invoice: finished, billable, not billed yet. */
const unbilledTime = (organizationId: string) =>
   ({
      organizationId,
      endedAt: { not: null },
      billable: true,
      invoiceLineId: null
   }) satisfies Prisma.TimeEntryWhereInput;

/** Recomputes the invoice's totals from its lines. Always inside the transaction that changed them. */
async function recalculate(tx: Prisma.TransactionClient, invoiceId: string) {
   const [{ _sum }, invoice] = await Promise.all([
      tx.invoiceLine.aggregate({ where: { invoiceId }, _sum: { amountCents: true } }),
      tx.invoice.findUniqueOrThrow({
         where: { id: invoiceId },
         select: { taxRateBasisPoints: true }
      })
   ]);
   const subtotalCents = _sum.amountCents ?? 0;
   const taxCents = taxAmount(subtotalCents, invoice.taxRateBasisPoints);
   await tx.invoice.update({
      where: { id: invoiceId },
      data: { subtotalCents, taxCents, totalCents: subtotalCents + taxCents }
   });
}

// --- Reading ---------------------------------------------------------------------------------

/** One page of the workspace's invoices, newest first, optionally by status. */
export async function listInvoices(orgSlug: string, query: InvoiceListQuery) {
   const { organization } = await requireInvoiceAccess(orgSlug, 'read');
   const where: Prisma.InvoiceWhereInput = {
      organizationId: organization.id,
      ...(query.status !== 'all' && {
         status: query.status.toUpperCase() as 'DRAFT' | 'SENT' | 'PAID' | 'VOID'
      })
   };
   const total = await db.invoice.count({ where });
   const pageCount = Math.max(1, Math.ceil(total / INVOICES_PAGE_SIZE));
   const page = Math.min(query.page, pageCount);
   const invoices = await db.invoice.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * INVOICES_PAGE_SIZE,
      take: INVOICES_PAGE_SIZE,
      select: {
         id: true,
         number: true,
         status: true,
         issueDate: true,
         dueDate: true,
         totalCents: true,
         currency: true,
         createdAt: true,
         client: { select: { name: true } }
      }
   });
   return { organization, invoices, total, page, pageCount, pageSize: INVOICES_PAGE_SIZE };
}

/**
 * Unbilled billable time per project (SQL GROUP BY), optionally for one client: what "New
 * invoice" offers. Everyone's time counts, not just the viewer's: the whole team bills the client.
 */
export async function listUnbilledTime(orgSlug: string, clientId?: string) {
   const { organization } = await requireInvoiceAccess(orgSlug, 'read');
   const groups = await db.timeEntry.groupBy({
      by: ['projectId'],
      where: { ...unbilledTime(organization.id), ...(clientId && { project: { clientId } }) },
      _sum: { durationSec: true },
      _count: { _all: true },
      _min: { startedAt: true },
      _max: { startedAt: true }
   });
   const projects = await db.project.findMany({
      where: {
         id: { in: groups.map((group) => group.projectId) },
         organizationId: organization.id
      },
      select: {
         id: true,
         name: true,
         color: true,
         hourlyRateCents: true,
         archivedAt: true,
         client: { select: { id: true, name: true, archivedAt: true } }
      }
   });
   const byId = new Map(projects.map((project) => [project.id, project]));
   return groups
      .flatMap((group) => {
         const project = byId.get(group.projectId);
         if (!project) return [];
         const seconds = group._sum.durationSec ?? 0;
         const quantity = secondsToQuantity(seconds);
         return [
            {
               project,
               seconds,
               entries: group._count._all,
               from: group._min.startedAt,
               to: group._max.startedAt,
               amountCents:
                  project.hourlyRateCents === null
                     ? null
                     : lineAmount(quantity, project.hourlyRateCents)
            }
         ];
      })
      .sort(
         (a, b) =>
            a.project.client.name.localeCompare(b.project.client.name) ||
            a.project.name.localeCompare(b.project.name)
      );
}

/** An invoice of this workspace with its client and lines, or 404. Shared by page and metadata. */
export const getInvoice = cache(async (orgSlug: string, invoiceId: string) => {
   const membership = await requireInvoiceAccess(orgSlug, 'read');
   const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: membership.organization.id },
      include: {
         client: {
            select: {
               id: true,
               name: true,
               email: true,
               company: true,
               address: true,
               archivedAt: true
            }
         },
         lines: {
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
            include: { _count: { select: { timeEntries: true } } }
         }
      }
   });
   if (!invoice) notFound();
   return { ...membership, invoice };
});

// --- Creating a draft from unbilled time -------------------------------------------------------

class TimeAlreadyBilled extends Error {}

/**
 * Creates a DRAFT for the client with one line per chosen project: its unbilled billable time
 * (all of it, whoever tracked it), at the project's rate. The time is linked to the line, which
 * marks it billed. Defaults (currency, tax, terms) come from the billing settings.
 */
export async function createInvoiceFromTime(
   orgSlug: string,
   input: { clientId: string; projectIds: string[] },
   timeZone: string
): Promise<InvoiceResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { invoice: ['create'] })) {
      return { ok: false, message: 'You are not allowed to create invoices in this workspace.' };
   }

   const client = await db.client.findFirst({
      where: { id: input.clientId, organizationId: organization.id, archivedAt: null },
      select: { id: true }
   });
   if (!client) {
      return { ok: false, field: 'clientId', message: 'Choose one of your active clients.' };
   }
   const projectIds = [...new Set(input.projectIds)];
   const projects = await db.project.findMany({
      where: { id: { in: projectIds }, organizationId: organization.id, clientId: client.id },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, hourlyRateCents: true }
   });
   if (projects.length !== projectIds.length) {
      return { ok: false, message: 'Some of those projects are not this client’s.' };
   }
   const settings = await getWorkspaceSettings(orgSlug);

   try {
      const invoice = await db.$transaction(async (tx) => {
         const created = await tx.invoice.create({
            data: {
               organizationId: organization.id,
               clientId: client.id,
               currency: settings.currency,
               paymentTermsDays: settings.paymentTermsDays,
               taxRateBasisPoints: settings.taxRateBasisPoints
            },
            select: { id: true }
         });

         let position = 0;
         for (const project of projects) {
            const entries = await tx.timeEntry.findMany({
               where: { ...unbilledTime(organization.id), projectId: project.id },
               orderBy: { startedAt: 'asc' },
               select: { id: true, durationSec: true, startedAt: true }
            });
            if (entries.length === 0) continue;

            const seconds = entries.reduce((sum, entry) => sum + (entry.durationSec ?? 0), 0);
            const quantityHundredths = secondsToQuantity(seconds);
            const unitPriceCents = project.hourlyRateCents ?? 0;
            const period = formatDayRange(
               entries[0].startedAt,
               entries.at(-1)!.startedAt,
               timeZone
            );
            const line = await tx.invoiceLine.create({
               data: {
                  organizationId: organization.id,
                  invoiceId: created.id,
                  position: position++,
                  description: `${project.name} (${period})`,
                  quantityHundredths,
                  unitPriceCents,
                  amountCents: lineAmount(quantityHundredths, unitPriceCents)
               },
               select: { id: true }
            });

            // Claim the time: only entries that are still unbilled. If another invoice claimed
            // some of them a moment ago, fewer rows change, and the whole draft is rolled back.
            const ids = entries.map((entry) => entry.id);
            const { count } = await tx.timeEntry.updateMany({
               where: { id: { in: ids }, invoiceLineId: null },
               data: { invoiceLineId: line.id }
            });
            if (count !== ids.length) throw new TimeAlreadyBilled();
         }

         await recalculate(tx, created.id);
         return created;
      });
      return { ok: true, invoiceId: invoice.id, orgSlug: organization.slug };
   } catch (error) {
      if (error instanceof TimeAlreadyBilled) {
         return { ok: false, message: 'Some of this time was just invoiced. Please try again.' };
      }
      throw error;
   }
}

// --- Editing a draft -------------------------------------------------------------------------

/** The draft's id if it exists in this workspace and is still a DRAFT; otherwise an error result. */
async function findDraft(organizationId: string, invoiceId: string) {
   const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      select: { id: true, status: true }
   });
   if (!invoice) return gone;
   if (invoice.status !== 'DRAFT') return notDraft;
   return null;
}

async function requireDraftEdit(orgSlug: string, invoiceId: string) {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { invoice: ['update'] })) {
      return {
         error: { ok: false, message: 'You are not allowed to edit invoices.' } as const,
         organization
      };
   }
   return { error: await findDraft(organization.id, invoiceId), organization };
}

/** Adds a manual line (a fixed fee, expenses...) at the end of a draft. */
export async function addInvoiceLine(
   orgSlug: string,
   invoiceId: string,
   input: InvoiceLineInput
): Promise<InvoiceResult> {
   const { error, organization } = await requireDraftEdit(orgSlug, invoiceId);
   if (error) return error;

   await db.$transaction(async (tx) => {
      const last = await tx.invoiceLine.aggregate({
         where: { invoiceId },
         _max: { position: true }
      });
      await tx.invoiceLine.create({
         data: {
            organizationId: organization.id,
            invoiceId,
            position: (last._max.position ?? -1) + 1,
            description: input.description,
            quantityHundredths: input.quantity,
            unitPriceCents: input.unitPrice,
            amountCents: lineAmount(input.quantity, input.unitPrice)
         }
      });
      await recalculate(tx, invoiceId);
   });
   return { ok: true, invoiceId, orgSlug: organization.slug };
}

/** Changes a line of a draft (e.g. round the hours, reword the description). */
export async function updateInvoiceLine(
   orgSlug: string,
   invoiceId: string,
   lineId: string,
   input: InvoiceLineInput
): Promise<InvoiceResult> {
   const { error, organization } = await requireDraftEdit(orgSlug, invoiceId);
   if (error) return error;

   const updated = await db.$transaction(async (tx) => {
      const { count } = await tx.invoiceLine.updateMany({
         where: { id: lineId, invoiceId, organizationId: organization.id },
         data: {
            description: input.description,
            quantityHundredths: input.quantity,
            unitPriceCents: input.unitPrice,
            amountCents: lineAmount(input.quantity, input.unitPrice)
         }
      });
      if (count) await recalculate(tx, invoiceId);
      return count;
   });
   if (!updated) return { ok: false, message: 'This line no longer exists.' };
   return { ok: true, invoiceId, orgSlug: organization.slug };
}

/** Removes a line from a draft. Time it billed becomes unbilled again (onDelete: SetNull). */
export async function deleteInvoiceLine(
   orgSlug: string,
   invoiceId: string,
   lineId: string
): Promise<InvoiceResult> {
   const { error, organization } = await requireDraftEdit(orgSlug, invoiceId);
   if (error) return error;

   const deleted = await db.$transaction(async (tx) => {
      const { count } = await tx.invoiceLine.deleteMany({
         where: { id: lineId, invoiceId, organizationId: organization.id }
      });
      if (count) await recalculate(tx, invoiceId);
      return count;
   });
   if (!deleted) return { ok: false, message: 'This line no longer exists.' };
   return { ok: true, invoiceId, orgSlug: organization.slug };
}

/** Tax rate, payment terms and notes of a draft. */
export async function updateInvoiceDetails(
   orgSlug: string,
   invoiceId: string,
   input: InvoiceDetailsInput
): Promise<InvoiceResult> {
   const { error, organization } = await requireDraftEdit(orgSlug, invoiceId);
   if (error) return error;

   await db.$transaction(async (tx) => {
      await tx.invoice.updateMany({
         where: { id: invoiceId, organizationId: organization.id, status: 'DRAFT' },
         data: {
            taxRateBasisPoints: input.taxRate,
            paymentTermsDays: input.paymentTermsDays,
            notes: input.notes
         }
      });
      await recalculate(tx, invoiceId); // the tax depends on the rate
   });
   return { ok: true, invoiceId, orgSlug: organization.slug };
}

/** Deletes a draft (never a sent invoice). Its time becomes unbilled again. */
export async function deleteDraft(orgSlug: string, invoiceId: string): Promise<InvoiceResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { invoice: ['delete'] })) {
      return { ok: false, message: 'You are not allowed to delete invoices.' };
   }
   const { count } = await db.invoice.deleteMany({
      where: { id: invoiceId, organizationId: organization.id, status: 'DRAFT' }
   });
   if (!count) return (await findDraft(organization.id, invoiceId)) ?? gone;
   return { ok: true, invoiceId, orgSlug: organization.slug };
}

// --- Status changes --------------------------------------------------------------------------

/** A calendar day ("2026-09-27") as a Date at UTC midnight, the way @db.Date columns store it. */
function dateOnly(day: string) {
   return new Date(`${day}T00:00:00.000Z`);
}

/**
 * DRAFT -> SENT: gives the invoice the next number, today's date (on the user's calendar) and a
 * due date, a secret public link, and snapshots of the sender's and the client's details. The
 * number comes from the settings row, incremented in the same transaction: the row lock means
 * two invoices sent at the same moment can't get the same number.
 */
export async function issueInvoice(
   orgSlug: string,
   invoiceId: string,
   timeZone: string
): Promise<InvoiceResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { invoice: ['send'] })) {
      return { ok: false, message: 'You are not allowed to send invoices.' };
   }
   const problem = await findDraft(organization.id, invoiceId);
   if (problem) return problem;

   try {
      return await db.$transaction(async (tx) => {
         const invoice = await tx.invoice.findUniqueOrThrow({
            where: { id: invoiceId },
            select: {
               paymentTermsDays: true,
               _count: { select: { lines: true } },
               client: { select: { name: true, email: true, company: true, address: true } }
            }
         });
         if (invoice._count.lines === 0) {
            return { ok: false, message: 'Add at least one line before sending.' } as const;
         }

         const settings = await tx.workspaceSettings.upsert({
            where: { organizationId: organization.id },
            create: { organizationId: organization.id, nextInvoiceNumber: 2 }, // first invoice: 1
            update: { nextInvoiceNumber: { increment: 1 } },
            select: {
               nextInvoiceNumber: true,
               invoicePrefix: true,
               businessName: true,
               businessEmail: true,
               businessAddress: true
            }
         });
         const sequence = settings.nextInvoiceNumber - 1;
         const today = TZDate.tz(timeZone);
         const client = invoice.client;

         const { count } = await tx.invoice.updateMany({
            where: { id: invoiceId, organizationId: organization.id, status: 'DRAFT' },
            data: {
               status: 'SENT',
               number: `${settings.invoicePrefix}${String(sequence).padStart(4, '0')}`,
               issueDate: dateOnly(dayKey(today, timeZone)),
               dueDate: dateOnly(dayKey(addDays(today, invoice.paymentTermsDays), timeZone)),
               sentAt: new Date(),
               publicToken: randomBytes(24).toString('base64url'), // 192 random bits
               fromName: settings.businessName ?? organization.name,
               fromEmail: settings.businessEmail,
               fromAddress: settings.businessAddress,
               billToName: client.name,
               billToEmail: client.email,
               billToAddress: [client.company, client.address].filter(Boolean).join('\n') || null
            }
         });
         if (!count) throw new Error('Invoice changed while sending'); // rolls back the number
         return { ok: true, invoiceId, orgSlug: organization.slug } as const;
      });
   } catch (error) {
      // The number already exists: "next number" in the settings was set back below one in use.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
         return {
            ok: false,
            message:
               'That invoice number is already used. Raise "Next number" in Settings › Billing and try again.'
         };
      }
      throw error;
   }
}

/** SENT (or overdue) -> PAID. Stripe does this automatically in Phase 6; this is by hand. */
export async function markInvoicePaid(orgSlug: string, invoiceId: string): Promise<InvoiceResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { invoice: ['update'] })) {
      return { ok: false, message: 'You are not allowed to change invoices.' };
   }
   const { count } = await db.invoice.updateMany({
      where: { id: invoiceId, organizationId: organization.id, status: 'SENT' },
      data: { status: 'PAID', paidAt: new Date() }
   });
   if (!count) return { ok: false, message: 'Only a sent invoice can be marked as paid.' };
   return { ok: true, invoiceId, orgSlug: organization.slug };
}

/**
 * SENT -> VOID: cancels an issued invoice (it keeps its number; issued invoices are never
 * deleted). Its time becomes unbilled again, so it can go on a corrected invoice.
 */
export async function voidInvoice(orgSlug: string, invoiceId: string): Promise<InvoiceResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { invoice: ['void'] })) {
      return { ok: false, message: 'You are not allowed to void invoices.' };
   }
   const voided = await db.$transaction(async (tx) => {
      const { count } = await tx.invoice.updateMany({
         where: { id: invoiceId, organizationId: organization.id, status: 'SENT' },
         data: { status: 'VOID', voidedAt: new Date() }
      });
      if (count) {
         await tx.timeEntry.updateMany({
            where: { organizationId: organization.id, invoiceLine: { invoiceId } },
            data: { invoiceLineId: null }
         });
      }
      return count;
   });
   if (!voided) return { ok: false, message: 'Only a sent, unpaid invoice can be voided.' };
   return { ok: true, invoiceId, orgSlug: organization.slug };
}

// --- Views, public link, email ---------------------------------------------------------------

/**
 * An invoice as shown in the app and in its PDF. Drafts show the business's and client's current
 * details; sent invoices their snapshot. "Overdue" is judged on the viewer's calendar.
 */
export async function getInvoiceView(orgSlug: string, invoiceId: string) {
   const { organization, role, invoice } = await getInvoice(orgSlug, invoiceId);
   const [settings, timeZone] = await Promise.all([getWorkspaceSettings(orgSlug), getTimeZone()]);
   const view = toInvoiceView(invoice, dayKey(new Date(requestNow()), timeZone), {
      from: {
         name: settings.businessName ?? organization.name,
         email: settings.businessEmail,
         address: settings.businessAddress
      },
      client: invoice.client
   });
   return { organization, role, invoice, view };
}

/** The public link's secret: 24 random bytes in base64url = 32 characters. */
const PUBLIC_TOKEN = /^[A-Za-z0-9_-]{32}$/;

/**
 * An issued invoice by its public token, for the client's page (no sign-in). Drafts never have a
 * token. Anyone with the link can view the invoice, like a shared document: the token is 192
 * random bits, so links can't be guessed. null = no such invoice.
 */
export const getPublicInvoice = cache(async (token: string) => {
   if (!PUBLIC_TOKEN.test(token)) return null; // don't even query for junk
   const invoice = await db.invoice.findUnique({
      where: { publicToken: token },
      include: { lines: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } }
   });
   if (!invoice || invoice.status === 'DRAFT') return null;
   // The visitor's time zone is unknown here, so "overdue" is judged on UTC's calendar.
   return { invoice, view: toInvoiceView(invoice, dayKey(new Date(requestNow()), 'UTC')) };
});

/** The public invoice URL for a token. */
export function publicInvoiceUrl(token: string) {
   return `${process.env.BETTER_AUTH_URL}/i/${token}`;
}

/**
 * Emails a SENT invoice to the client's address (from the snapshot), with the PDF attached and
 * replies going to the business's email. Also used for "Resend".
 */
export async function emailInvoice(orgSlug: string, invoiceId: string): Promise<InvoiceResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { invoice: ['send'] })) {
      return { ok: false, message: 'You are not allowed to send invoices.' };
   }
   const found = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: organization.id },
      select: { status: true, billToEmail: true, publicToken: true }
   });
   if (!found) return gone;
   if (found.status !== 'SENT' || !found.publicToken) {
      return { ok: false, message: 'Only a sent, unpaid invoice can be emailed.' };
   }
   if (!found.billToEmail) {
      return { ok: false, message: 'This invoice has no client email address.' };
   }
   if (await isDemoWorkspace(organization.id)) return demoNoEmail;

   const { view } = await getInvoiceView(orgSlug, invoiceId);
   const pdf = await renderInvoicePdf(view);
   await sendEmail({
      to: found.billToEmail,
      subject: `Invoice ${view.number} from ${view.from.name}`,
      replyTo: view.from.email,
      react: createElement(InvoiceEmail, {
         fromName: view.from.name,
         clientName: view.billTo.name,
         number: view.number ?? '',
         total: formatMoney(view.totalCents, view.currency),
         dueDate: view.dueDate ? formatDate(view.dueDate, DATE_ONLY_ZONE) : '',
         url: publicInvoiceUrl(found.publicToken)
      }),
      attachments: [
         { filename: invoicePdfFilename(view), content: pdf, contentType: 'application/pdf' }
      ]
   });
   return { ok: true, invoiceId, orgSlug: organization.slug };
}

/** At most one reminder per invoice in this many hours, so a client is never flooded. */
export const REMINDER_INTERVAL_HOURS = 24;

/**
 * Emails a payment reminder for a SENT invoice (overdue or not yet due), with the PDF and the
 * link where the client can pay. Records when it was sent and how many were sent.
 */
export async function sendInvoiceReminder(
   orgSlug: string,
   invoiceId: string
): Promise<InvoiceResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { invoice: ['send'] })) {
      return { ok: false, message: 'You are not allowed to send invoices.' };
   }
   const found = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: organization.id },
      select: { status: true, billToEmail: true, publicToken: true, lastReminderAt: true }
   });
   if (!found) return gone;
   if (found.status !== 'SENT' || !found.publicToken) {
      return { ok: false, message: 'Only a sent, unpaid invoice can get a reminder.' };
   }
   if (!found.billToEmail) {
      return { ok: false, message: 'This invoice has no client email address.' };
   }
   if (await isDemoWorkspace(organization.id)) return demoNoEmail;

   // Claim the reminder before sending: the condition makes two clicks (or two admins) at the
   // same moment send one email, not two.
   const now = new Date();
   const { count } = await db.invoice.updateMany({
      where: {
         id: invoiceId,
         organizationId: organization.id,
         status: 'SENT',
         OR: [
            { lastReminderAt: null },
            { lastReminderAt: { lte: subHours(now, REMINDER_INTERVAL_HOURS) } }
         ]
      },
      data: { lastReminderAt: now, reminderCount: { increment: 1 } }
   });
   if (!count) {
      return {
         ok: false,
         message: `A reminder was already sent in the last ${REMINDER_INTERVAL_HOURS} hours.`
      };
   }

   try {
      // "Overdue" on the sender's calendar, the same as the badge they see.
      const { view } = await getInvoiceView(orgSlug, invoiceId);
      const pdf = await renderInvoicePdf(view);
      const details = {
         number: view.number ?? '',
         dueDate: view.dueDate ? formatDate(view.dueDate, DATE_ONLY_ZONE) : '',
         overdue: view.status === 'overdue'
      };
      await sendEmail({
         to: found.billToEmail,
         subject: reminderSubject(details),
         replyTo: view.from.email,
         react: createElement(InvoiceReminderEmail, {
            ...details,
            fromName: view.from.name,
            clientName: view.billTo.name,
            total: formatMoney(view.totalCents, view.currency),
            url: publicInvoiceUrl(found.publicToken)
         }),
         attachments: [
            { filename: invoicePdfFilename(view), content: pdf, contentType: 'application/pdf' }
         ]
      });
   } catch (error) {
      // Not sent (SMTP down, ...): give the claim back, so it can be retried straight away.
      console.error('Sending the invoice reminder failed', error);
      await db.invoice.updateMany({
         where: { id: invoiceId, organizationId: organization.id, lastReminderAt: now },
         data: { lastReminderAt: found.lastReminderAt, reminderCount: { decrement: 1 } }
      });
      return { ok: false, message: 'The reminder could not be sent. Please try again later.' };
   }
   return { ok: true, invoiceId, orgSlug: organization.slug };
}
