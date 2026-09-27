import 'server-only';
import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { can } from '@/lib/permissions';
import { isDemoWorkspace } from '@/server/demo';
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
         select: {
            id: true,
            role: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true } }
         }
      }),
      canManageInvitations
         ? db.invitation.findMany({
              where: {
                 organizationId: organization.id,
                 status: 'pending',
                 expiresAt: { gt: new Date() }
              },
              orderBy: { createdAt: 'desc' },
              select: {
                 id: true,
                 email: true,
                 role: true,
                 expiresAt: true,
                 user: { select: { name: true } }
              }
           })
         : Promise.resolve(null)
   ]);

   // What the current user may do to each row. This mirrors Better Auth's rules so the page only
   // offers actions that can succeed; Better Auth still enforces them when an action runs.
   const iAmOwner = hasRole(role, 'owner');
   const canUpdate = can(role, { member: ['update'] });
   const canDelete = can(role, { member: ['delete'] });
   const rows = members.map((member) => {
      const isMe = member.user.id === session.user.id;
      const touchable = !hasRole(member.role, 'owner') || iAmOwner; // only owners manage owners
      return {
         ...member,
         isMe,
         canChangeRole: !isMe && canUpdate && touchable,
         canRemove: !isMe && canDelete && touchable
      };
   });

   return {
      organization,
      role,
      members: rows,
      invitations,
      canCancelInvitations: can(role, { invitation: ['cancel'] }),
      // Only owners can make someone an owner.
      assignableRoles: iAmOwner
         ? (['member', 'admin', 'owner'] as const)
         : (['member', 'admin'] as const)
   };
}

function hasRole(memberRole: string, name: string) {
   return memberRole.split(',').some((role) => role.trim() === name);
}

export type InviteResult =
   { ok: true; emailed: boolean } | { ok: false; field?: 'email'; message: string };

/**
 * Invite someone to the workspace by email. The organization comes from the membership check,
 * never from the form. Better Auth checks the permission again and sends the email
 * (sendInvitationEmail in lib/auth.ts).
 */
export async function inviteMember(
   orgSlug: string,
   input: { email: string; role: 'member' | 'admin' }
): Promise<InviteResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { invitation: ['create'] })) {
      return { ok: false, message: 'You are not allowed to invite members to this workspace.' };
   }

   try {
      await auth.api.createInvitation({
         body: { email: input.email, role: input.role, organizationId: organization.id },
         headers: await headers()
      });
      // In a demo workspace the invitation exists but no email went out (see lib/auth.ts).
      return { ok: true, emailed: !(await isDemoWorkspace(organization.id)) };
   } catch (error) {
      if (!(error instanceof APIError)) throw error;
      switch (error.body?.code) {
         case 'USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION':
            return {
               ok: false,
               field: 'email',
               message: 'This person is already a member of this workspace.'
            };
         case 'USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION':
            return {
               ok: false,
               field: 'email',
               message: 'This person already has a pending invitation.'
            };
         default:
            return { ok: false, message: error.message };
      }
   }
}

// ---------------------------------------------------------------------------------------------
// Managing members. Better Auth enforces the safety rules (permissions, only owners touch owners,
// never zero owners); these functions add the tenant check and turn its error codes into
// messages people understand.

export type MemberActionResult = { ok: true } | { ok: false; message: string };

const friendlyErrors: Record<string, string> = {
   YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER:
      'A workspace needs at least one owner. Make someone else an owner first.',
   YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER:
      'You are the only owner. Make someone else an owner before leaving or removing yourself.',
   YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER:
      'Only owners can change an owner, or make someone an owner.',
   YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER: 'You are not allowed to remove this member.',
   YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION: 'You are not allowed to cancel this invitation.',
   MEMBER_NOT_FOUND: 'This member is no longer part of the workspace.'
};

async function callBetterAuth(run: () => Promise<unknown>): Promise<MemberActionResult> {
   try {
      await run();
      return { ok: true };
   } catch (error) {
      if (!(error instanceof APIError)) throw error;
      const code = error.body?.code;
      return { ok: false, message: (code && friendlyErrors[code]) || error.message };
   }
}

export async function updateMemberRole(
   orgSlug: string,
   memberId: string,
   newRole: 'member' | 'admin' | 'owner'
) {
   const { organization } = await requireMembership(orgSlug);
   return callBetterAuth(async () =>
      auth.api.updateMemberRole({
         body: { memberId, role: newRole, organizationId: organization.id },
         headers: await headers()
      })
   );
}

export async function removeMember(orgSlug: string, memberId: string) {
   const { organization } = await requireMembership(orgSlug);
   return callBetterAuth(async () =>
      auth.api.removeMember({
         body: { memberIdOrEmail: memberId, organizationId: organization.id },
         headers: await headers()
      })
   );
}

export async function cancelInvitation(orgSlug: string, invitationId: string) {
   const { organization } = await requireMembership(orgSlug);
   // Better Auth looks the invitation up by id alone; make sure it belongs to *this* workspace.
   const invitation = await db.invitation.findFirst({
      where: { id: invitationId, organizationId: organization.id },
      select: { id: true }
   });
   if (!invitation) return { ok: false, message: 'This invitation no longer exists.' } as const;
   return callBetterAuth(async () =>
      auth.api.cancelInvitation({ body: { invitationId }, headers: await headers() })
   );
}

export async function leaveWorkspace(orgSlug: string) {
   const { organization } = await requireMembership(orgSlug);
   return callBetterAuth(async () =>
      auth.api.leaveOrganization({
         body: { organizationId: organization.id },
         headers: await headers()
      })
   );
}
