import { z } from 'zod';
import { CURRENCY_CODES } from '@/lib/money';
import {
   optionalEmail,
   optionalText,
   percentToBasisPoints,
   wholeNumber
} from '@/lib/validations/common';

// The billing settings form (Settings > Billing).
export const billingSettingsSchema = z.object({
   businessName: optionalText(100),
   businessEmail: optionalEmail,
   businessAddress: optionalText(500),
   currency: z.enum(CURRENCY_CODES, 'Choose a currency'),
   invoicePrefix: z
      .string()
      .trim()
      .max(10, 'Must be at most 10 characters')
      .regex(/^[A-Za-z0-9\-/#_.]*$/, 'Use letters, numbers and - / # _ . only'),
   nextInvoiceNumber: wholeNumber(1, 999_999, 'Enter a number from 1 to 999999'),
   paymentTermsDays: wholeNumber(0, 365, 'Enter a number of days from 0 to 365'),
   taxRate: percentToBasisPoints
});

export type BillingSettingsInput = z.infer<typeof billingSettingsSchema>;
