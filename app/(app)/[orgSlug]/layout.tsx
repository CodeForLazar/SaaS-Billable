import { cookies } from 'next/headers';
import { after } from 'next/server';
import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import {
   listMemberships,
   rememberActiveWorkspace,
   requireMembership
} from '@/server/organizations';

// The app shell around every workspace page: sidebar (workspace switcher, navigation, user menu)
// and a header bar. Layouts re-render when [orgSlug] changes, so this also runs whenever the user
// enters or switches workspace (not on every page change inside the same workspace).
//
// Note: this is not the access check. Each page still calls requireMembership itself (layouts
// don't re-run on every navigation); the call is cached, so it's one database lookup per request.
export default async function WorkspaceLayout({ children, params }: LayoutProps<'/[orgSlug]'>) {
   const { session, organization, role } = await requireMembership((await params).orgSlug);
   const memberships = await listMemberships(session.user.id);

   // Remember this workspace for the next sign-in. after() runs it once the response is sent,
   // and we only write when it actually changed.
   if (session.user.lastActiveOrganizationId !== organization.id) {
      after(() => rememberActiveWorkspace(session.user.id, organization.id));
   }

   // The sidebar stores open/collapsed in a cookie; reading it here renders the right state on the
   // server, so there's no flash of the wrong layout on page load.
   const sidebarCookie = (await cookies()).get('sidebar_state')?.value;

   return (
      <SidebarProvider defaultOpen={sidebarCookie !== 'false'}>
         <AppSidebar
            organization={{ id: organization.id, name: organization.name, slug: organization.slug }}
            role={role}
            workspaces={memberships.map((m) => m.organization)}
            user={{ name: session.user.name, email: session.user.email, image: session.user.image }}
         />
         <SidebarInset>
            <AppHeader />
            <div className='flex flex-1 flex-col'>{children}</div>
         </SidebarInset>
      </SidebarProvider>
   );
}
