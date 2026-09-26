'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import { inviteMemberSchema } from '@/lib/validations/organization';
import { inviteMember } from '@/server/members';

export type InviteFormState =
   | {
        error?: string;
        fieldErrors?: { email?: string[]; role?: string[] };
        values?: { email?: string; role?: string };
        sentTo?: string;
     }
   | undefined;

// orgSlug is bound by the page: inviteMemberAction.bind(null, orgSlug). Bound arguments come
// from the browser like any other input, so the service checks membership with it, never trusts it.
export async function inviteMemberAction(
   orgSlug: string,
   _prevState: InviteFormState,
   formData: FormData
): Promise<InviteFormState> {
   const input = Object.fromEntries(formData);
   const values = { email: String(input.email ?? ''), role: String(input.role ?? '') };

   const parsed = inviteMemberSchema.safeParse(input);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }

   const result = await inviteMember(orgSlug, parsed.data);
   if (!result.ok) {
      return result.field ? { fieldErrors: { [result.field]: [result.message] }, values } : { error: result.message, values };
   }

   // Re-render this page's server data so the new invitation shows up in the list.
   refresh();
   return { sentTo: parsed.data.email };
}
