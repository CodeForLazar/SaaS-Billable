import { z } from 'zod';
import { MONEY_PATTERN, inputToCents } from '@/utils/money';
import { optionalText, percentToBasisPoints, wholeNumber } from '@/validations/common';

const id = z.string().trim().min(1).max(100);

// ?status=...&page=... on the invoices list. From the URL: junk falls back to defaults.
export const INVOICE_FILTERS = ['all', 'draft', 'sent', 'paid', 'void'] as const;
export const invoiceListQuerySchema = z.object({
   status: z.enum(INVOICE_FILTERS).catch('all'),
   page: z.coerce.number().int().min(1).max(10_000).catch(1)
});
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

// "Create draft": a client and the projects whose unbilled time goes on the invoice (none is
// fine: an invoice with only manual lines).
export const createInvoiceSchema = z.object({
   clientId: id.or(z.literal('')).refine(Boolean, 'Choose a client'),
   projectIds: z.array(id).max(500)
});

/** "6.5" -> 650 hundredths. Same text parsing as money (no float maths). */
const hundredths = (message: string) =>
   z
      .string()
      .trim()
      .refine((value) => MONEY_PATTERN.test(value), message)
      .transform(inputToCents);

// A line typed on a draft: description, quantity (hours or units), unit price.
export const invoiceLineSchema = z.object({
   description: z
      .string()
      .trim()
      .min(1, 'Enter a description')
      .max(500, 'Must be at most 500 characters'),
   quantity: hundredths('Enter a quantity like 1 or 6.5').refine(
      (value) => value > 0,
      'The quantity must be more than 0'
   ),
   unitPrice: hundredths('Enter an amount like 75 or 75.50')
});
export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

// The draft's other settings.
export const invoiceDetailsSchema = z.object({
   taxRate: percentToBasisPoints,
   paymentTermsDays: wholeNumber(0, 365, 'Enter a number of days from 0 to 365'),
   notes: optionalText(2000)
});
export type InvoiceDetailsInput = z.infer<typeof invoiceDetailsSchema>;
