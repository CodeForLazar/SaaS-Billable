import { type DisplayStatus, displayStatus } from '@/utils/invoice-status';

// What an invoice shows, in one shape for the app page, the public page and the PDF. A draft
// shows the business's and the client's CURRENT details; a sent invoice shows the snapshot taken
// when it was sent (so editing a client later never changes an issued invoice).

type Party = { name: string; email: string | null; address: string | null };

export type InvoiceView = {
   status: DisplayStatus;
   number: string | null;
   currency: string;
   issueDate: Date | null; // calendar dates at UTC midnight: format them with timeZone 'UTC'
   dueDate: Date | null;
   paymentTermsDays: number;
   from: Party;
   billTo: Party;
   lines: {
      id: string;
      description: string;
      quantityHundredths: number;
      unitPriceCents: number;
      amountCents: number;
   }[];
   subtotalCents: number;
   taxRateBasisPoints: number;
   taxCents: number;
   totalCents: number;
   notes: string | null;
   paidAt: Date | null;
   voidedAt: Date | null;
};

type InvoiceRecord = {
   status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID';
   number: string | null;
   currency: string;
   issueDate: Date | null;
   dueDate: Date | null;
   paymentTermsDays: number;
   taxRateBasisPoints: number;
   subtotalCents: number;
   taxCents: number;
   totalCents: number;
   notes: string | null;
   paidAt: Date | null;
   voidedAt: Date | null;
   fromName: string | null;
   fromEmail: string | null;
   fromAddress: string | null;
   billToName: string | null;
   billToEmail: string | null;
   billToAddress: string | null;
   lines: InvoiceView['lines'];
};

export function toInvoiceView(
   invoice: InvoiceRecord,
   todayKey: string,
   live?: {
      // Only needed for drafts: the details as they are now.
      from: Party;
      client: {
         name: string;
         email: string | null;
         company: string | null;
         address: string | null;
      };
   }
): InvoiceView {
   const draft = invoice.status === 'DRAFT';
   const from: Party =
      draft && live
         ? live.from
         : { name: invoice.fromName ?? '', email: invoice.fromEmail, address: invoice.fromAddress };
   const billTo: Party =
      draft && live
         ? {
              name: live.client.name,
              email: live.client.email,
              address: [live.client.company, live.client.address].filter(Boolean).join('\n') || null
           }
         : {
              name: invoice.billToName ?? '',
              email: invoice.billToEmail,
              address: invoice.billToAddress
           };

   return {
      status: displayStatus(invoice, todayKey),
      number: invoice.number,
      currency: invoice.currency,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paymentTermsDays: invoice.paymentTermsDays,
      from,
      billTo,
      lines: invoice.lines.map((line) => ({
         id: line.id,
         description: line.description,
         quantityHundredths: line.quantityHundredths,
         unitPriceCents: line.unitPriceCents,
         amountCents: line.amountCents
      })),
      subtotalCents: invoice.subtotalCents,
      taxRateBasisPoints: invoice.taxRateBasisPoints,
      taxCents: invoice.taxCents,
      totalCents: invoice.totalCents,
      notes: invoice.notes,
      paidAt: invoice.paidAt,
      voidedAt: invoice.voidedAt
   };
}
