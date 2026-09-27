import { cookies } from 'next/headers';
import { after } from 'next/server';
import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';
import { RunningTimer } from '@/components/running-timer';
import { TimeZoneSync } from '@/components/time-zone-sync';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TIME_ZONE_COOKIE, requestNow } from '@/lib/time-zone';
import {
   listMemberships,
   rememberActiveWorkspace,
   requireMembership
} from '@/server/organizations';
import { getRunningTimer } from '@/server/time-entries';

// The app shell around every workspace page: sidebar (workspace switcher, navigation, user menu)
// and a header bar. Layouts re-render when [orgSlug] changes, so this also runs whenever the user
// enters or switches workspace (not on every page change inside the same workspace).
//
// Note: this is not the access check. Each page still calls requireMembership itself (layouts
// don't re-run on every navigation); the call is cached, so it's one database lookup per request.
export default async function WorkspaceLayout({ children, params }: LayoutProps<'/[orgSlug]'>) {
   const { session, organization, role } = await requireMembership((await params).orgSlug);
   const [memberships, timer] = await Promise.all([
      listMemberships(session.user.id),
      getRunningTimer()
   ]);

   // Remember this workspace for the next sign-in. after() runs it once the response is sent,
   // and we only write when it actually changed.
   if (session.user.lastActiveOrganizationId !== organization.id) {
      after(() => rememberActiveWorkspace(session.user.id, organization.id));
   }

   // The sidebar stores open/collapsed in a cookie; reading it here renders the right state on the
   // server, so there's no flash of the wrong layout on page load.
   const cookieStore = await cookies();
   const sidebarCookie = cookieStore.get('sidebar_state')?.value;

   return (
      <SidebarProvider defaultOpen={sidebarCookie !== 'false'}>
         <AppSidebar
            organization={{ id: organization.id, name: organization.name, slug: organization.slug }}
            role={role}
            workspaces={memberships.map((m) => m.organization)}
            user={{ name: session.user.name, email: session.user.email, image: session.user.image }}
         />
         <SidebarInset>
            <AppHeader>
               {/* The header shows the running timer on every page. The layout re-renders after
                   start/stop because those actions call refresh(). */}
               {timer && (
                  <RunningTimer
                     timer={timer}
                     renderedAt={requestNow()}
                     currentOrgSlug={organization.slug}
                  />
               )}
            </AppHeader>
            <div className='flex flex-1 flex-col'>{children}</div>
         </SidebarInset>
         <TimeZoneSync current={cookieStore.get(TIME_ZONE_COOKIE)?.value} />
      </SidebarProvider>
   );
}
