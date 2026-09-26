import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * The tenant check. Every page and service function for a workspace starts here.
 *
 * - Not signed in           -> redirect to /sign-in
 * - Not a member of the org -> 404, exactly as if the workspace didn't exist, so URLs
 *   can't be used to discover other customers' workspaces
 * - Member                  -> the session, the organization and the user's role in it
 *
 * The organization comes from the URL slug *plus* a membership lookup for the signed-in
 * user, never from anything the browser sends. cache() dedupes calls within one request.
 */
export const requireMembership = cache(async (orgSlug: string) => {
   const session = await getSession();
   if (!session) redirect('/sign-in');

   const membership = await db.member.findFirst({
      where: { userId: session.user.id, organization: { slug: orgSlug } },
      select: {
         role: true,
         organization: { select: { id: true, name: true, slug: true, logo: true } }
      }
   });
   if (!membership) notFound();

   return { session, organization: membership.organization, role: membership.role };
});

/** All workspaces the user belongs to, oldest membership first. */
export const listMemberships = cache(async (userId: string) => {
   return db.member.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, organization: { select: { id: true, name: true, slug: true } } }
   });
});

/**
 * Where to send a signed-in user who didn't ask for a specific workspace (e.g. right after
 * sign-in): the workspace they were last in, if they're still a member, else their first one,
 * else null (they have none yet).
 */
export async function getHomeWorkspaceSlug(
   userId: string,
   lastActiveOrganizationId?: string | null
) {
   const memberships = await listMemberships(userId);
   const last = memberships.find((m) => m.organization.id === lastActiveOrganizationId);
   return (last ?? memberships[0])?.organization.slug ?? null;
}

/** Remember the workspace the user is in, so the next sign-in returns to it. */
export async function rememberActiveWorkspace(userId: string, organizationId: string) {
   await db.user.update({
      where: { id: userId },
      data: { lastActiveOrganizationId: organizationId }
   });
}
