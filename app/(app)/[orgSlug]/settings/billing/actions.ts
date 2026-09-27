'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import { billingSettingsSchema } from '@/lib/validations/settings';
import { updateWorkspaceSettings } from '@/server/settings';

const FIELDS = [
   'businessName',
   'businessEmail',
   'businessAddress',
   'currency',
   'invoicePrefix',
   'nextInvoiceNumber',
   'paymentTermsDays',
   'taxRate'
] as const;
type Field = (typeof FIELDS)[number];
export type BillingValues = Record<Field, string>;

export type BillingFormState =
   | {
        error?: string;
        fieldErrors?: Partial<Record<Field, string[]>>;
        values?: BillingValues;
        saved?: boolean;
     }
   | undefined;

// orgSlug is bound by the page; the service checks the membership and the role.
export async function saveBillingSettingsAction(
   orgSlug: string,
   _prevState: BillingFormState,
   formData: FormData
): Promise<BillingFormState> {
   const values = Object.fromEntries(
      FIELDS.map((field) => {
         const value = formData.get(field);
         return [field, typeof value === 'string' ? value : ''];
      })
   ) as BillingValues;

   const parsed = billingSettingsSchema.safeParse(values);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }
   const result = await updateWorkspaceSettings(orgSlug, parsed.data);
   if (!result.ok) return { error: result.message, values };

   refresh();
   return { saved: true, values };
}
