import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getHomeWorkspaceSlug } from '@/server/organizations';

// Not a real page: "take me to my workspace". Sign-in and other flows send users here without
// knowing which workspace they belong to; this picks one (or sends them to create one).
export default async function DashboardRedirectPage() {
   const session = await getSession();
   if (!session) redirect('/sign-in');

   const slug = await getHomeWorkspaceSlug(session.user.id, session.user.lastActiveOrganizationId);
   redirect(slug ? `/${slug}/dashboard` : '/create-workspace');
}
