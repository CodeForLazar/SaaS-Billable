import 'server-only';
import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { cache } from 'react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * A pending, non-expired invitation, or null. Readable without signing in: the id is a long random
 * value that only appears in the invitee's email (like a reset link). Accepting still requires being
 * signed in as the invited email; Better Auth checks that.
 */
export const getOpenInvitation = cache(async (invitationId: string) => {
   const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
      select: {
         id: true,
         email: true,
         role: true,
         status: true,
         expiresAt: true,
         organization: { select: { id: true, name: true, slug: true } },
         user: { select: { name: true } } // the inviter
      }
   });
   if (!invitation || invitation.status !== 'pending' || invitation.expiresAt < new Date()) return null;

   return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role ?? 'member',
      expiresAt: invitation.expiresAt,
      organization: invitation.organization,
      inviterName: invitation.user.name
   };
});

export type InvitationResult = { ok: true; organizationSlug: string } | { ok: false; message: string };

const invalidMessage = 'This invitation is no longer valid. Ask for a new one.';

/** Accept as the signed-in user. Better Auth checks the email matches and the invitation is still open. */
export async function acceptInvitation(invitationId: string): Promise<InvitationResult> {
   const invitation = await getOpenInvitation(invitationId);
   if (!invitation) return { ok: false, message: invalidMessage };

   // Already a member (e.g. added another way meanwhile)? Nothing to accept; the unique
   // constraint on member would reject a second membership anyway.
   const session = await getSession();
   const existing = session
      ? await db.member.findFirst({ where: { userId: session.user.id, organizationId: invitation.organization.id } })
      : null;
   if (existing) return { ok: true, organizationSlug: invitation.organization.slug };

   try {
      await auth.api.acceptInvitation({ body: { invitationId }, headers: await headers() });
      return { ok: true, organizationSlug: invitation.organization.slug };
   } catch (error) {
      if (!(error instanceof APIError)) throw error;
      if (error.body?.code === 'YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION') {
         return { ok: false, message: `This invitation was sent to ${invitation.email}.` };
      }
      if (error.body?.code === 'INVITATION_NOT_FOUND') return { ok: false, message: invalidMessage };
      return { ok: false, message: error.message };
   }
}

/** Decline as the signed-in user (marks the invitation as rejected). */
export async function declineInvitation(invitationId: string): Promise<InvitationResult> {
   const invitation = await getOpenInvitation(invitationId);
   if (!invitation) return { ok: false, message: invalidMessage };

   try {
      await auth.api.rejectInvitation({ body: { invitationId }, headers: await headers() });
      return { ok: true, organizationSlug: invitation.organization.slug };
   } catch (error) {
      if (!(error instanceof APIError)) throw error;
      return { ok: false, message: error.message };
   }
}
