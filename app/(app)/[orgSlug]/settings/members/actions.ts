'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { inviteMemberSchema } from '@/lib/validations/organization';
import {
   type MemberActionResult,
   cancelInvitation,
   inviteMember,
   leaveWorkspace,
   removeMember,
   updateMemberRole
} from '@/server/members';

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
      return result.field
         ? { fieldErrors: { [result.field]: [result.message] }, values }
         : { error: result.message, values };
   }

   // Re-render this page's server data so the new invitation shows up in the list.
   refresh();
   return { sentTo: parsed.data.email };
}

// The actions below are called directly from click handlers with plain arguments (not a form).
// They're still public endpoints, so every argument is validated before use.

const id = z.string().min(1).max(100);
const invalid: MemberActionResult = { ok: false, message: 'Invalid request.' };

export async function updateMemberRoleAction(
   orgSlug: string,
   memberId: string,
   role: string
): Promise<MemberActionResult> {
   const parsed = z
      .object({ memberId: id, role: z.enum(['member', 'admin', 'owner']) })
      .safeParse({ memberId, role });
   if (!parsed.success) return invalid;
   const result = await updateMemberRole(orgSlug, parsed.data.memberId, parsed.data.role);
   if (result.ok) refresh();
   return result;
}

export async function removeMemberAction(
   orgSlug: string,
   memberId: string
): Promise<MemberActionResult> {
   if (!id.safeParse(memberId).success) return invalid;
   const result = await removeMember(orgSlug, memberId);
   if (result.ok) refresh();
   return result;
}

export async function cancelInvitationAction(
   orgSlug: string,
   invitationId: string
): Promise<MemberActionResult> {
   if (!id.safeParse(invitationId).success) return invalid;
   const result = await cancelInvitation(orgSlug, invitationId);
   if (result.ok) refresh();
   return result;
}

export async function leaveWorkspaceAction(orgSlug: string): Promise<MemberActionResult> {
   const result = await leaveWorkspace(orgSlug);
   if (!result.ok) return result;
   // No longer a member here: go to another workspace (or create one).
   redirect('/dashboard');
}
