import 'server-only';
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
