import { after } from 'next/server';
import { rememberActiveWorkspace, requireMembership } from '@/server/organizations';

// Wraps every page of a workspace. Layouts re-render when [orgSlug] changes, so this runs whenever
// the user enters or switches workspace (not on every page change inside the same workspace).
// The app shell (sidebar, header) comes here in Phase 2.
//
// Note: this is not the access check. Each page still calls requireMembership itself (layouts
// don't re-run on every navigation); the call is cached, so it's one database lookup per request.
export default async function WorkspaceLayout({ children, params }: LayoutProps<'/[orgSlug]'>) {
   const { session, organization } = await requireMembership((await params).orgSlug);

   // Remember this workspace for the next sign-in. after() runs it once the response is sent,
   // and we only write when it actually changed.
   if (session.user.lastActiveOrganizationId !== organization.id) {
      after(() => rememberActiveWorkspace(session.user.id, organization.id));
   }

   return children;
}
