'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getTimeZone } from '@/lib/time-zone';
import {
   createInvoiceSchema,
   invoiceDetailsSchema,
   invoiceLineSchema
} from '@/lib/validations/invoice';
import {
   type InvoiceResult,
   addInvoiceLine,
   createInvoiceFromTime,
   deleteDraft,
   deleteInvoiceLine,
   emailInvoice,
   issueInvoice,
   markInvoicePaid,
   sendInvoiceReminder,
   updateInvoiceDetails,
   updateInvoiceLine,
   voidInvoice
} from '@/server/invoices';

// Every action gets the workspace (and invoice/line ids) bound by the page. Like any input they
// come from the browser: the services check membership, role, and that the records belong to
// this workspace (and that the invoice is still a draft where that matters).

const id = z.string().min(1).max(100);
const invalid = { ok: false, message: 'Invalid request.' } as const;

/** A form field as a string ('' when missing or a file). */
function text(formData: FormData, name: string) {
   const value = formData.get(name);
   return typeof value === 'string' ? value : '';
}

// --- New invoice ---------------------------------------------------------------------------

export type CreateInvoiceState = { error?: string; clientError?: string } | undefined;

export async function createInvoiceAction(
   orgSlug: string,
   _prevState: CreateInvoiceState,
   formData: FormData
): Promise<CreateInvoiceState> {
   const parsed = createInvoiceSchema.safeParse({
      clientId: text(formData, 'clientId'),
      // Every ticked project checkbox sends one "projectId" field.
      projectIds: formData.getAll('projectId').filter((value) => typeof value === 'string')
   });
   if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors;
      return { clientError: errors.clientId?.[0], error: errors.projectIds?.[0] };
   }
   const result = await createInvoiceFromTime(orgSlug, parsed.data, await getTimeZone());
   if (!result.ok) {
      return result.field ? { clientError: result.message } : { error: result.message };
   }
   // The draft's page: add lines, adjust, send. (After a successful service call, so the slug
   // is a verified workspace slug.)
   redirect(`/${result.orgSlug}/invoices/${result.invoiceId}`);
}

// --- Lines -----------------------------------------------------------------------------------

const LINE_FIELDS = ['description', 'quantity', 'unitPrice'] as const;
export type LineValues = Record<(typeof LINE_FIELDS)[number], string>;
export type LineFormState =
   | {
        ok?: boolean;
        error?: string;
        fieldErrors?: Partial<Record<keyof LineValues, string[]>>;
        values?: LineValues;
     }
   | undefined;

async function saveLine(
   formData: FormData,
   save: (input: z.infer<typeof invoiceLineSchema>) => Promise<InvoiceResult>
): Promise<LineFormState> {
   const values = Object.fromEntries(
      LINE_FIELDS.map((field) => [field, text(formData, field)])
   ) as LineValues;
   const parsed = invoiceLineSchema.safeParse(values);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }
   const result = await save(parsed.data);
   if (!result.ok) return { error: result.message, values };
   refresh(); // the lines and totals re-render
   return { ok: true };
}

export async function addLineAction(
   orgSlug: string,
   invoiceId: string,
   _prevState: LineFormState,
   formData: FormData
): Promise<LineFormState> {
   if (!id.safeParse(invoiceId).success) return invalid;
   return saveLine(formData, (input) => addInvoiceLine(orgSlug, invoiceId, input));
}

export async function updateLineAction(
   orgSlug: string,
   invoiceId: string,
   lineId: string,
   _prevState: LineFormState,
   formData: FormData
): Promise<LineFormState> {
   if (!id.safeParse(invoiceId).success || !id.safeParse(lineId).success) return invalid;
   return saveLine(formData, (input) => updateInvoiceLine(orgSlug, invoiceId, lineId, input));
}

export async function deleteLineAction(
   orgSlug: string,
   invoiceId: string,
   lineId: string
): Promise<InvoiceResult> {
   if (!id.safeParse(invoiceId).success || !id.safeParse(lineId).success) return invalid;
   const result = await deleteInvoiceLine(orgSlug, invoiceId, lineId);
   if (result.ok) refresh();
   return result;
}

// --- Draft details ---------------------------------------------------------------------------

const DETAIL_FIELDS = ['taxRate', 'paymentTermsDays', 'notes'] as const;
export type DetailValues = Record<(typeof DETAIL_FIELDS)[number], string>;
export type DetailsFormState =
   | {
        saved?: boolean;
        error?: string;
        fieldErrors?: Partial<Record<keyof DetailValues, string[]>>;
        values?: DetailValues;
     }
   | undefined;

export async function updateDetailsAction(
   orgSlug: string,
   invoiceId: string,
   _prevState: DetailsFormState,
   formData: FormData
): Promise<DetailsFormState> {
   if (!id.safeParse(invoiceId).success) return { error: invalid.message };
   const values = Object.fromEntries(
      DETAIL_FIELDS.map((field) => [field, text(formData, field)])
   ) as DetailValues;
   const parsed = invoiceDetailsSchema.safeParse(values);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }
   const result = await updateInvoiceDetails(orgSlug, invoiceId, parsed.data);
   if (!result.ok) return { error: result.message, values };
   refresh();
   return { saved: true, values };
}

// --- Status changes (buttons) ----------------------------------------------------------------

export async function deleteDraftAction(orgSlug: string, invoiceId: string) {
   if (!id.safeParse(invoiceId).success) return invalid;
   const result = await deleteDraft(orgSlug, invoiceId);
   if (!result.ok) return result;
   redirect(`/${result.orgSlug}/invoices`);
}

export async function markPaidAction(orgSlug: string, invoiceId: string) {
   if (!id.safeParse(invoiceId).success) return invalid;
   const result = await markInvoicePaid(orgSlug, invoiceId);
   if (result.ok) refresh();
   return result;
}

export async function voidInvoiceAction(orgSlug: string, invoiceId: string) {
   if (!id.safeParse(invoiceId).success) return invalid;
   const result = await voidInvoice(orgSlug, invoiceId);
   if (result.ok) refresh();
   return result;
}

// --- Sending ---------------------------------------------------------------------------------

export type SendResult =
   { ok: true; emailed?: boolean; warning?: string } | { ok: false; message: string };

/** Sends an email and turns a failure (SMTP down, bad address...) into a warning. */
async function tryEmail(orgSlug: string, invoiceId: string): Promise<SendResult> {
   try {
      const result = await emailInvoice(orgSlug, invoiceId);
      return result.ok ? { ok: true, emailed: true } : { ok: true, warning: result.message };
   } catch (error) {
      console.error('Sending the invoice email failed', error);
      return { ok: true, warning: 'The email could not be sent. Try "Resend email" later.' };
   }
}

/**
 * DRAFT -> SENT (numbered, dated, locked), then optionally emailed. The two are separate on
 * purpose: if the email fails, the invoice is still correctly issued and can be re-emailed.
 */
export async function sendInvoiceAction(
   orgSlug: string,
   invoiceId: string,
   email: boolean
): Promise<SendResult> {
   const parsed = z.object({ invoiceId: id, email: z.boolean() }).safeParse({ invoiceId, email });
   if (!parsed.success) return invalid;
   const issued = await issueInvoice(orgSlug, invoiceId, await getTimeZone());
   if (!issued.ok) return issued;
   refresh();
   return parsed.data.email ? tryEmail(orgSlug, invoiceId) : { ok: true };
}

/** Emails a sent invoice again (the client lost it, or the first email failed). */
export async function resendInvoiceAction(orgSlug: string, invoiceId: string): Promise<SendResult> {
   if (!id.safeParse(invoiceId).success) return invalid;
   const result = await tryEmail(orgSlug, invoiceId);
   return result.ok && result.warning ? { ok: false, message: result.warning } : result;
}

/** A payment reminder for a sent invoice (at most one per 24 hours). */
export async function sendReminderAction(orgSlug: string, invoiceId: string): Promise<SendResult> {
   if (!id.safeParse(invoiceId).success) return invalid;
   // Not wrapped in try/catch: requireMembership's notFound() must reach Next (a 404), and the
   // service already turns a failed email into a message.
   const result = await sendInvoiceReminder(orgSlug, invoiceId);
   if (!result.ok) return result;
   refresh();
   return { ok: true };
}
