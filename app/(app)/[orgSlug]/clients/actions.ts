'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { clientSchema } from '@/validations/client';
import { type ClientResult, createClient, setClientArchived, updateClient } from '@/server/clients';

const FIELDS = ['name', 'company', 'email', 'address', 'notes'] as const;
type ClientField = (typeof FIELDS)[number];

export type ClientFormState =
   | {
        error?: string;
        fieldErrors?: Partial<Record<ClientField, string[]>>;
        values?: Record<ClientField, string>;
     }
   | undefined;

// A form field is a string, or a File for file inputs. Anything that isn't a string (or is
// missing) counts as empty, and Zod decides whether empty is allowed.
function readFields(formData: FormData) {
   return Object.fromEntries(
      FIELDS.map((field) => {
         const value = formData.get(field);
         return [field, typeof value === 'string' ? value : ''];
      })
   ) as Record<ClientField, string>;
}

// Both forms end the same way: an error goes back to the form (with what was typed),
// success opens the client's page. redirect() works by throwing, so it stays outside any try/catch.
function finish(result: ClientResult, values: Record<ClientField, string>): ClientFormState {
   if (!result.ok) return { error: result.message, values };
   redirect(`/${result.orgSlug}/clients/${result.clientId}`);
}

// orgSlug (and clientId) are bound by the page: action.bind(null, orgSlug). Bound arguments come
// from the browser like any other input, so the service checks them against the membership.
export async function createClientAction(
   orgSlug: string,
   _prevState: ClientFormState,
   formData: FormData
): Promise<ClientFormState> {
   const values = readFields(formData);
   const parsed = clientSchema.safeParse(values);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }

   return finish(await createClient(orgSlug, parsed.data), values);
}

export async function updateClientAction(
   orgSlug: string,
   clientId: string,
   _prevState: ClientFormState,
   formData: FormData
): Promise<ClientFormState> {
   const values = readFields(formData);
   if (!z.string().min(1).max(100).safeParse(clientId).success) {
      return { error: 'Invalid request.', values };
   }
   const parsed = clientSchema.safeParse(values);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }

   return finish(await updateClient(orgSlug, clientId, parsed.data), values);
}

// Called from a button's click handler (not a form), with plain arguments: validated here.
export async function setClientArchivedAction(
   orgSlug: string,
   clientId: string,
   archived: boolean
): Promise<ClientResult> {
   const parsed = z
      .object({ clientId: z.string().min(1).max(100), archived: z.boolean() })
      .safeParse({ clientId, archived });
   if (!parsed.success) return { ok: false, message: 'Invalid request.' };

   const result = await setClientArchived(orgSlug, parsed.data.clientId, parsed.data.archived);
   if (result.ok) refresh(); // re-render the client page with its new state
   return result;
}
