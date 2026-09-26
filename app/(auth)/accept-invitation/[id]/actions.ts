'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { authHref } from '@/lib/safe-redirect';
import { acceptInvitation, declineInvitation, getOpenInvitation } from '@/server/invitations';

export type InvitationActionState = { error?: string } | undefined;

// invitationId is bound by the page (.bind(null, id)). It's input like any other: the services
// look the invitation up and Better Auth checks that the signed-in user is its recipient.

export async function acceptInvitationAction(invitationId: string): Promise<InvitationActionState> {
   const result = await acceptInvitation(invitationId);
   if (!result.ok) return { error: result.message };
   redirect(`/${result.organizationSlug}/dashboard`);
}

export async function declineInvitationAction(invitationId: string): Promise<InvitationActionState> {
   const result = await declineInvitation(invitationId);
   if (!result.ok) return { error: result.message };
   redirect('/dashboard');
}

/** Signed in as someone else: sign out, then come back here signed in as the invited email. */
export async function switchAccountAction(invitationId: string) {
   const invitation = await getOpenInvitation(invitationId);
   await auth.api.signOut({ headers: await headers() });
   redirect(authHref('/sign-in', { redirectTo: `/accept-invitation/${invitationId}`, email: invitation?.email }));
}
