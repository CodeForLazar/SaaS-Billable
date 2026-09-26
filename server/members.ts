import 'server-only';
import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { can } from '@/lib/permissions';
import { requireMembership } from '@/server/organizations';

/**
 * Everything the members page shows. Every member can see who is in the workspace;
 * pending invitations are only returned to roles that may manage invitations.
 */
export async function getMembersOverview(orgSlug: string) {
   const { session, organization, role } = await requireMembership(orgSlug);
   const canManageInvitations = can(role, { invitation: ['create'] });

   const [members, invitations] = await Promise.all([
      db.member.findMany({
         where: { organizationId: organization.id },
         orderBy: { createdAt: 'asc' },
         select: { id: true, role: true, createdAt: true, user: { select: { id: true, name: true, email: true } } }
      }),
      canManageInvitations
         ? db.invitation.findMany({
              where: { organizationId: organization.id, status: 'pending', expiresAt: { gt: new Date() } },
              orderBy: { createdAt: 'desc' },
              select: { id: true, email: true, role: true, expiresAt: true, user: { select: { name: true } } }
           })
         : Promise.resolve(null)
   ]);

   return { organization, currentUserId: session.user.id, role, members, invitations };
}

export type InviteResult = { ok: true } | { ok: false; field?: 'email'; message: string };

/**
 * Invite someone to the workspace by email. The organization comes from the membership check,
 * never from the form. Better Auth checks the permission again and sends the email
 * (sendInvitationEmail in lib/auth.ts).
 */
export async function inviteMember(orgSlug: string, input: { email: string; role: 'member' | 'admin' }): Promise<InviteResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { invitation: ['create'] })) {
      return { ok: false, message: 'You are not allowed to invite members to this workspace.' };
   }

   try {
      await auth.api.createInvitation({
         body: { email: input.email, role: input.role, organizationId: organization.id },
         headers: await headers()
      });
      return { ok: true };
   } catch (error) {
      if (!(error instanceof APIError)) throw error;
      switch (error.body?.code) {
         case 'USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION':
            return { ok: false, field: 'email', message: 'This person is already a member of this workspace.' };
         case 'USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION':
            return { ok: false, field: 'email', message: 'This person already has a pending invitation.' };
         default:
            return { ok: false, message: error.message };
      }
   }
}
