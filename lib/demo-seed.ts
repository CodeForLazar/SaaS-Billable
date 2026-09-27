import { randomBytes } from 'node:crypto';
import { TZDate } from '@date-fns/tz';
import {
   addDays,
   addMinutes,
   isWeekend,
   set,
   startOfDay,
   startOfMonth,
   subDays,
   subMinutes,
   subMonths
} from 'date-fns';
import { hashPassword } from 'better-auth/crypto';
import { dayKey, formatDayRange } from '@/lib/format';
import type { Prisma, PrismaClient } from '@/lib/generated/prisma/client';

// A realistic demo workspace: a small design & development studio with a team of three, six
// clients, 10 weeks of tracked time and a year of invoices and payments. Everything is dated
// relative to "now", so the dashboard always looks alive.
//
// Used by `npm run db:seed` (a local demo login) and, next, by the "Try the demo" button (one
// sandbox per visitor). No `server-only` here: the seed script runs outside Next.js.
//
// The same random seed gives the same workspace every time (only the dates move with today).

export type DemoSeedOptions = {
   /** Prefix for the demo users' emails: "demo" -> demo@example.com, demo-sam@example.com. */
   key: string;
   /** The workspace's URL slug. */
   slug: string;
   /** The owner's password (a random one for sandboxes). */
   password: string;
   /** Dates and working hours are laid out on this clock ("Europe/Skopje"). */
   timeZone: string;
   now?: Date;
};

export type DemoSeedResult = { organizationId: string; ownerId: string; ownerEmail: string };

/** The demo team's emails for a key: the owner first ("demo@example.com", "demo-sam@..."). */
export function demoEmails(key: string) {
   return TEAM.map((member) =>
      member.role === 'owner' ? `${key}@example.com` : `${key}-${member.handle}@example.com`
   );
}

// --- Deterministic randomness ----------------------------------------------------------------

/** mulberry32: a tiny seeded random generator, so every demo gets the same "random" data. */
function random(seed: number) {
   return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   };
}

/** An id in the same style as Prisma's cuid(): lowercase letters and digits. */
const newId = () => `c${randomBytes(12).toString('hex')}`;

/** A plain Date for Prisma (date-fns keeps returning TZDates when given one). */
const plain = (date: Date) => new Date(date.getTime());

/** A calendar date for @db.Date columns: midnight UTC of that day (like server/invoices.ts). */
const dateOnly = (date: Date, timeZone: string) => new Date(`${dayKey(date, timeZone)}T00:00:00Z`);

// --- The studio ------------------------------------------------------------------------------

const TEAM = [
   { handle: 'alex', name: 'Alex Morgan', role: 'owner' },
   { handle: 'sam', name: 'Sam Rivera', role: 'admin' },
   { handle: 'jordan', name: 'Jordan Kim', role: 'member' }
] as const;
type Handle = (typeof TEAM)[number]['handle'];

const CLIENTS = [
   {
      key: 'brightline',
      name: 'Brightline Coffee Co.',
      email: 'olivia.chen@example.com',
      address: '2210 Roaster Row\nSeattle, WA 98101',
      notes: 'Contact: Olivia Chen, marketing lead. Prefers updates on Fridays.'
   },
   {
      key: 'harbor',
      name: 'Harbor & Finch Architects',
      email: 'marcus.reed@example.com',
      address: '88 Wharf Street, Suite 400\nBoston, MA 02110',
      notes: 'Contact: Marcus Reed, partner.'
   },
   {
      key: 'lumen',
      name: 'Lumen Health',
      email: 'priya.nair@example.com',
      address: '1500 Innovation Way\nAustin, TX 78701',
      notes: 'Net 30 payment terms agreed with their finance team.'
   },
   {
      key: 'fieldnote',
      name: 'Fieldnote Publishing',
      email: 'sara.lindqvist@example.com',
      address: '17 Bookbinder Lane\nPortland, OR 97209',
      notes: null
   },
   {
      key: 'kestrel',
      name: 'Kestrel Outdoor',
      email: 'tom.becker@example.com',
      address: '4 Trailhead Road\nDenver, CO 80202',
      notes: 'Contact: Tom Becker, founder.'
   },
   {
      key: 'oldmill',
      name: 'Old Mill Bakery',
      email: 'hello.oldmill@example.com',
      address: '9 Mill Pond Road\nBurlington, VT 05401',
      notes: 'Menu project finished in spring.',
      archivedMonthsAgo: 5
   }
] as const;
type ClientKey = (typeof CLIENTS)[number]['key'];

const PROJECTS: {
   key: string;
   client: ClientKey;
   name: string;
   rate: number; // cents per hour
   color: string;
   team: Handle[]; // who tracks time on it
   tasks: string[];
}[] = [
   {
      key: 'bl-web',
      client: 'brightline',
      name: 'Website redesign',
      rate: 9500,
      color: '#059669',
      team: ['alex', 'sam'],
      tasks: [
         'Homepage layout and hero section',
         'Product pages: responsive grid',
         'Checkout flow fixes',
         'Performance pass: images and fonts',
         'Review call with Olivia',
         'Store locator map'
      ]
   },
   {
      key: 'bl-brand',
      client: 'brightline',
      name: 'Brand refresh',
      rate: 8500,
      color: '#d97706',
      team: ['alex', 'jordan'],
      tasks: [
         'Logo exploration',
         'Color palette and type scale',
         'Packaging mockups',
         'Brand guidelines document'
      ]
   },
   {
      key: 'hf-site',
      client: 'harbor',
      name: 'Portfolio site',
      rate: 11000,
      color: '#0284c7',
      team: ['alex'],
      tasks: [
         'Project gallery with filters',
         'CMS setup for case studies',
         'Photo retouching and crops',
         'Accessibility audit fixes'
      ]
   },
   {
      key: 'lh-portal',
      client: 'lumen',
      name: 'Patient portal UI',
      rate: 12000,
      color: '#4f46e5',
      team: ['alex', 'sam'],
      tasks: [
         'Appointment booking flow',
         'Messages inbox',
         'Form validation and error states',
         'Usability test sessions',
         'Sprint planning'
      ]
   },
   {
      key: 'lh-ds',
      client: 'lumen',
      name: 'Design system',
      rate: 12000,
      color: '#9333ea',
      team: ['jordan', 'alex'],
      tasks: [
         'Button and input components',
         'Data table patterns',
         'Documentation site',
         'Dark mode tokens'
      ]
   },
   {
      key: 'fn-launch',
      client: 'fieldnote',
      name: 'Book launch page',
      rate: 9000,
      color: '#db2777',
      team: ['jordan', 'sam'],
      tasks: ['Landing page design', 'Pre-order form', 'Author interview page', 'Launch analytics']
   },
   {
      key: 'ko-store',
      client: 'kestrel',
      name: 'Online store',
      rate: 10000,
      color: '#dc2626',
      team: ['sam', 'alex'],
      tasks: [
         'Product import and variants',
         'Shipping rules',
         'Theme customization',
         'Payment testing'
      ]
   },
   {
      key: 'om-menu',
      client: 'oldmill',
      name: 'Menu & signage',
      rate: 7000,
      color: '#57534e',
      team: [],
      tasks: ['Menu layout', 'Window signage']
   }
];

// Non-billable time that happens on client projects (calls nobody invoices).
const NON_BILLABLE_TASKS = ['Internal sync', 'Estimating a change request', 'Tool setup'];

/** Days of tracked time, ending today. */
const TRACKED_DAYS = 70;

// --- Building the data -----------------------------------------------------------------------

export async function seedDemoWorkspace(
   db: PrismaClient,
   options: DemoSeedOptions
): Promise<DemoSeedResult> {
   const { key, slug, timeZone } = options;
   const now = options.now ?? new Date();
   const rnd = random(20260927);
   const pick = <T>(items: readonly T[]) => items[Math.floor(rnd() * items.length)];
   const between = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
   const today = startOfDay(new TZDate(now, timeZone));
   const daysAgo = (days: number) => subDays(today, days);

   // --- Workspace, team, settings
   const organizationId = newId();
   const emails = demoEmails(key);
   const users = TEAM.map((member, i) => ({ ...member, id: newId(), email: emails[i] }));
   const owner = users[0];
   const settings = {
      organizationId,
      currency: 'USD',
      businessName: 'Maple Street Studio',
      businessEmail: owner.email,
      businessAddress: '418 Maple Street\nPortland, OR 97205',
      invoicePrefix: 'MS-',
      paymentTermsDays: 14,
      taxRateBasisPoints: 0
   };

   // --- Clients and projects
   const clients = CLIENTS.map((client) => ({
      id: newId(),
      organizationId,
      name: client.name,
      email: client.email,
      company: null,
      address: client.address,
      notes: client.notes,
      archivedAt:
         'archivedMonthsAgo' in client ? plain(subMonths(today, client.archivedMonthsAgo)) : null,
      createdAt: plain(subMonths(today, 13))
   }));
   const clientByKey = new Map(CLIENTS.map((client, i) => [client.key, clients[i]]));
   const projects = PROJECTS.map((project) => {
      const client = clientByKey.get(project.client)!;
      return {
         ...project,
         id: newId(),
         clientId: client.id,
         archivedAt: client.archivedAt
      };
   });

   // --- Time: every weekday of the last 10 weeks, 2–3 blocks per person between 9:00 and 18:00
   type Entry = Prisma.TimeEntryCreateManyInput & { startedAt: Date };
   const entries: Entry[] = [];
   for (let day = TRACKED_DAYS; day >= 0; day--) {
      const date = daysAgo(day);
      if (isWeekend(date)) continue;
      for (const member of users) {
         // A day off now and then, except for the owner in the last two weeks: that's the Time
         // page a demo visitor sees first.
         const dayOff = rnd() < 0.1;
         if (dayOff && (member.role !== 'owner' || day > 14)) continue;
         const ownProjects = projects.filter(
            (project) => !project.archivedAt && project.team.includes(member.handle)
         );
         let start = set(date, { hours: 9, minutes: between(0, 3) * 10 });
         const blocks = between(2, 3);
         for (let block = 0; block < blocks; block++) {
            const minutes = pick([45, 60, 90, 120, 150, 180]);
            const end = addMinutes(start, minutes);
            if (end > now || end.getHours() >= 19) break; // not in the future, not after 19:00
            const project = pick(ownProjects);
            const billable = rnd() > 0.1;
            entries.push({
               id: newId(),
               organizationId,
               projectId: project.id,
               userId: member.id,
               description: billable ? pick(project.tasks) : pick(NON_BILLABLE_TASKS),
               startedAt: plain(start),
               endedAt: plain(end),
               durationSec: minutes * 60,
               billable
            });
            start = addMinutes(end, pick([15, 30, 45, 60]));
         }
      }
   }

   // --- Invoices
   type Invoice = Prisma.InvoiceCreateManyInput & { id: string };
   type Line = Prisma.InvoiceLineCreateManyInput & { id: string };
   const invoices: Invoice[] = [];
   const lines: Line[] = [];
   const payments: Prisma.PaymentCreateManyInput[] = [];

   const snapshot = (client: (typeof clients)[number]) => ({
      fromName: settings.businessName,
      fromEmail: settings.businessEmail,
      fromAddress: settings.businessAddress,
      billToName: client.name,
      billToEmail: client.email,
      billToAddress: client.address
   });

   /** An invoice with its lines (already built), in a given state. */
   function addInvoice(
      client: (typeof clients)[number],
      invoiceLines: (Omit<Line, 'id' | 'organizationId' | 'invoiceId' | 'position'> & {
         id?: string; // given when time entries already point at the line
      })[],
      state: {
         status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID';
         issued?: Date; // start of the issue day (user's clock)
         termsDays?: number;
         paidAfterDays?: number;
         online?: boolean; // paid through Stripe (a Payment row)
         reminded?: Date;
      }
   ) {
      const id = newId();
      const subtotal = invoiceLines.reduce((sum, line) => sum + line.amountCents, 0);
      invoiceLines.forEach((line, position) =>
         lines.push({ ...line, id: line.id ?? newId(), organizationId, invoiceId: id, position })
      );
      const terms = state.termsDays ?? settings.paymentTermsDays;
      const issued = state.issued;
      // The seconds make every send time unique, so numbers and list order always agree.
      const sentAt =
         issued &&
         set(issued, { hours: 10, minutes: between(0, 50), seconds: invoices.length % 60 });
      const paidAt =
         issued && state.paidAfterDays !== undefined
            ? set(addDays(issued, state.paidAfterDays), { hours: between(8, 17) })
            : null;
      invoices.push({
         id,
         organizationId,
         clientId: client.id,
         status: state.status,
         currency: settings.currency,
         paymentTermsDays: terms,
         taxRateBasisPoints: 0,
         subtotalCents: subtotal,
         taxCents: 0,
         totalCents: subtotal,
         // Drafted the day before sending (the list sorts by this, newest first).
         createdAt: plain(issued ? subDays(sentAt!, 1) : subDays(now, 1)),
         ...(issued && {
            issueDate: dateOnly(issued, timeZone),
            dueDate: dateOnly(addDays(issued, terms), timeZone),
            sentAt: plain(sentAt!),
            publicToken: randomBytes(24).toString('base64url'),
            ...snapshot(client)
         }),
         ...(state.status === 'PAID' && { paidAt: plain(paidAt!) }),
         ...(state.status === 'VOID' && { voidedAt: plain(addDays(sentAt!, 3)) }),
         ...(state.reminded && { lastReminderAt: plain(state.reminded), reminderCount: 1 })
      });
      if (state.status === 'PAID' && state.online) {
         payments.push({
            organizationId,
            invoiceId: id,
            amountCents: subtotal,
            currency: settings.currency,
            stripeCheckoutSessionId: `cs_demo_${randomBytes(12).toString('hex')}`,
            paidAt: plain(paidAt!)
         });
      }
      return id;
   }

   /** Invoice lines for a client's time in [from, to): one per project, linking the entries. */
   function billTime(client: (typeof clients)[number], from: Date, to: Date) {
      const byProject = new Map<string, Entry[]>();
      for (const entry of entries) {
         const project = projects.find((p) => p.id === entry.projectId)!;
         if (
            project.clientId !== client.id ||
            !entry.billable ||
            entry.invoiceLineId ||
            entry.startedAt < from ||
            entry.startedAt >= to
         ) {
            continue;
         }
         byProject.set(project.key, [...(byProject.get(project.key) ?? []), entry]);
      }
      return [...byProject.entries()].map(([projectKey, projectEntries]) => {
         const project = projects.find((p) => p.key === projectKey)!;
         const seconds = projectEntries.reduce((sum, entry) => sum + (entry.durationSec ?? 0), 0);
         const quantityHundredths = Math.max(1, Math.round(seconds / 36));
         const lineId = newId();
         for (const entry of projectEntries) entry.invoiceLineId = lineId;
         return {
            id: lineId,
            description: `${project.name} (${formatDayRange(projectEntries[0].startedAt, projectEntries.at(-1)!.startedAt, timeZone)})`,
            quantityHundredths,
            unitPriceCents: project.rate,
            amountCents: Math.round((quantityHundredths * project.rate) / 100)
         };
      });
   }

   /** Adds an invoice whose lines bill tracked time (keeping the line ids the entries point at). */
   function addTimeInvoice(
      clientKey: ClientKey,
      from: Date,
      to: Date,
      state: Parameters<typeof addInvoice>[2]
   ) {
      const client = clientByKey.get(clientKey)!;
      const timeLines = billTime(client, from, to);
      if (timeLines.length > 0) addInvoice(client, timeLines, state);
   }

   // A year of history before the tracked time: 4 paid invoices a month with manual lines
   // ("Website redesign: design phase", 42.5 h). Sized like the billed tracked time (a team of
   // three), growing from ~55 % of today's volume a year ago, so the revenue chart has no jump.
   const PHASES = ['discovery', 'design', 'development', 'revisions', 'launch support'];
   for (let monthsAgo = 12; monthsAgo >= 2; monthsAgo--) {
      const month = startOfMonth(subMonths(today, monthsAgo));
      const growth = 0.55 + (0.45 * (12 - monthsAgo)) / 10;
      const count = 4;
      for (let i = 0; i < count; i++) {
         const candidates = projects.filter(
            (project) => project.key !== 'om-menu' || monthsAgo > 5 // Old Mill's project ended in spring
         );
         const project = pick(candidates);
         const client = clients.find((c) => c.id === project.clientId)!;
         const phases = rnd() < 0.3 ? 2 : 1;
         const phaseLines = Array.from({ length: phases }, () => {
            // Hours in half hours, e.g. 42.5 h = 4250 hundredths.
            const quantityHundredths =
               Math.round((between(40, 65) * growth) / phases) * 100 + 50 * between(0, 1);
            return {
               description: `${project.name}: ${pick(PHASES)} phase`,
               quantityHundredths,
               unitPriceCents: project.rate,
               amountCents: Math.round((quantityHundredths * project.rate) / 100)
            };
         });
         // The month the tracked time starts only has invoices from its first days.
         const issued = addDays(month, monthsAgo === 2 ? between(0, 9) : between(0, 26));
         const voided = monthsAgo === 4 && i === 0;
         addInvoice(client, phaseLines, {
            status: voided ? 'VOID' : 'PAID',
            issued,
            paidAfterDays: voided ? undefined : between(4, 20),
            online: rnd() < 0.5
         });
         if (voided) {
            // The corrected invoice, sent a few days later: two hours less on the first line.
            const corrected = phaseLines.map((line, index) => {
               const quantityHundredths = line.quantityHundredths - (index === 0 ? 200 : 0);
               return {
                  ...line,
                  quantityHundredths,
                  amountCents: Math.round((quantityHundredths * line.unitPriceCents) / 100)
               };
            });
            addInvoice(client, corrected, {
               status: 'PAID',
               issued: addDays(issued, 4),
               paidAfterDays: between(5, 12)
            });
         }
      }
   }

   // Tracked time in two billing periods, then this period's time left unbilled.
   const periodA = { from: daysAgo(TRACKED_DAYS + 1), to: daysAgo(42) };
   const periodB = { from: daysAgo(42), to: daysAgo(21) };
   for (const clientKey of ['brightline', 'harbor', 'lumen', 'fieldnote', 'kestrel'] as const) {
      addTimeInvoice(clientKey, periodA.from, periodA.to, {
         status: 'PAID',
         issued: daysAgo(41),
         termsDays: clientKey === 'lumen' ? 30 : 14,
         paidAfterDays: between(5, 13),
         online: clientKey !== 'harbor'
      });
   }
   addTimeInvoice('brightline', periodB.from, periodB.to, {
      status: 'PAID',
      issued: daysAgo(20),
      paidAfterDays: 9,
      online: true
   });
   addTimeInvoice('harbor', periodB.from, periodB.to, {
      status: 'PAID',
      issued: daysAgo(20),
      paidAfterDays: 15
   });
   // Net 30: sent, not due yet.
   addTimeInvoice('lumen', periodB.from, periodB.to, {
      status: 'SENT',
      issued: daysAgo(20),
      termsDays: 30
   });
   // Overdue by a week, one reminder sent.
   addTimeInvoice('kestrel', periodB.from, periodB.to, {
      status: 'SENT',
      issued: daysAgo(21),
      reminded: set(daysAgo(2), { hours: 9, minutes: 12 })
   });
   addTimeInvoice('fieldnote', periodB.from, periodB.to, {
      status: 'SENT',
      issued: daysAgo(12)
   });
   // A draft from this period's Fieldnote time, ready to review and send.
   addTimeInvoice('fieldnote', periodB.to, addDays(today, 1), { status: 'DRAFT' });

   // Numbers in the order the invoices were sent: MS-0001, MS-0002, ...
   const issuedInvoices = invoices
      .filter((invoice) => invoice.status !== 'DRAFT')
      .sort((a, b) => (a.sentAt as Date).getTime() - (b.sentAt as Date).getTime());
   issuedInvoices.forEach((invoice, i) => {
      invoice.number = `${settings.invoicePrefix}${String(i + 1).padStart(4, '0')}`;
   });

   // --- Write it all in one transaction (all or nothing)
   const passwordHash = await hashPassword(options.password);
   await db.$transaction(
      async (tx) => {
         await tx.user.createMany({
            data: users.map((user) => ({
               id: user.id,
               name: user.name,
               email: user.email,
               emailVerified: true,
               lastActiveOrganizationId: organizationId
            }))
         });
         // Only the owner can sign in; the teammates have no password.
         await tx.account.create({
            data: {
               id: newId(),
               userId: owner.id,
               accountId: owner.id,
               providerId: 'credential',
               password: passwordHash
            }
         });
         await tx.organization.create({
            data: {
               id: organizationId,
               name: settings.businessName,
               slug,
               createdAt: plain(subMonths(today, 13))
            }
         });
         await tx.member.createMany({
            data: users.map((user) => ({
               id: newId(),
               organizationId,
               userId: user.id,
               role: user.role,
               createdAt: plain(subMonths(today, 13))
            }))
         });
         await tx.invitation.create({
            data: {
               id: newId(),
               organizationId,
               email: 'taylor.brooks@example.com',
               role: 'member',
               status: 'pending',
               expiresAt: addDays(now, 2), // now is a plain Date
               inviterId: owner.id
            }
         });
         await tx.workspaceSettings.create({
            data: { ...settings, nextInvoiceNumber: issuedInvoices.length + 1 }
         });
         await tx.client.createMany({ data: clients });
         await tx.project.createMany({
            data: projects.map((project) => ({
               id: project.id,
               organizationId,
               clientId: project.clientId,
               name: project.name,
               hourlyRateCents: project.rate,
               color: project.color,
               archivedAt: project.archivedAt,
               createdAt: plain(subMonths(today, 12))
            }))
         });
         await tx.invoice.createMany({ data: invoices });
         await tx.invoiceLine.createMany({ data: lines });
         await tx.timeEntry.createMany({ data: entries });
         // A timer running right now for the owner (visible in the header).
         await tx.timeEntry.create({
            data: {
               organizationId,
               projectId: projects.find((project) => project.key === 'lh-portal')!.id,
               userId: owner.id,
               description: 'Appointment booking flow',
               startedAt: subMinutes(now, 38),
               billable: true
            }
         });
         await tx.payment.createMany({ data: payments });
      },
      { timeout: 30_000 }
   );

   return { organizationId, ownerId: owner.id, ownerEmail: owner.email };
}
