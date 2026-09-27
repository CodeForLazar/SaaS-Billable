'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
   Clock,
   Contact,
   FileText,
   FolderKanban,
   Landmark,
   LayoutDashboard,
   Users
} from 'lucide-react';
import { NavUser } from '@/components/nav-user';
import {
   Sidebar,
   SidebarContent,
   SidebarFooter,
   SidebarGroup,
   SidebarGroupContent,
   SidebarGroupLabel,
   SidebarHeader,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
   SidebarRail,
   useSidebar
} from '@/components/ui/sidebar';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { can } from '@/lib/permissions';

type Workspace = { id: string; name: string; slug: string };

type Props = {
   organization: Workspace;
   role: string;
   workspaces: Workspace[];
   user: { name: string; email: string; image?: string | null };
};

type NavItem = {
   title: string;
   path: string;
   icon: typeof Users;
   /** Only shown to roles with this permission (the page itself checks again and 404s). */
   permission?: Parameters<typeof can>[1];
};

// Paths are relative to the workspace (/<slug>/...). Clients, projects, time and invoices are
// added here as each of them is built, so the demo never links to a page that doesn't exist.
const navGroups: { label: string; items: NavItem[] }[] = [
   {
      label: 'Workspace',
      items: [
         { title: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
         { title: 'Clients', path: 'clients', icon: Contact },
         { title: 'Projects', path: 'projects', icon: FolderKanban },
         { title: 'Time', path: 'time', icon: Clock },
         {
            title: 'Invoices',
            path: 'invoices',
            icon: FileText,
            permission: { invoice: ['read'] }
         }
      ]
   },
   {
      label: 'Settings',
      items: [
         { title: 'Members', path: 'settings/members', icon: Users },
         {
            title: 'Billing',
            path: 'settings/billing',
            icon: Landmark,
            permission: { organization: ['update'] }
         }
      ]
   }
];

// A Client Component only because it highlights the current page (usePathname). All data comes
// in as props from the workspace layout, which is a Server Component.
export function AppSidebar({ organization, role, workspaces, user }: Props) {
   const pathname = usePathname();
   // On phones the sidebar is a drawer over the page: close it once a link is tapped.
   const { isMobile, setOpenMobile } = useSidebar();

   return (
      <Sidebar collapsible='icon'>
         <SidebarHeader>
            <WorkspaceSwitcher current={organization} role={role} workspaces={workspaces} />
         </SidebarHeader>
         <SidebarContent>
            {navGroups.map((group) => (
               <SidebarGroup key={group.label}>
                  <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                     <SidebarMenu>
                        {group.items
                           .filter((item) => !item.permission || can(role, item.permission))
                           .map((item) => {
                              const href = `/${organization.slug}/${item.path}`;
                              const isActive = pathname === href || pathname.startsWith(`${href}/`);
                              return (
                                 <SidebarMenuItem key={item.path}>
                                    <SidebarMenuButton
                                       render={<Link href={href} />}
                                       onClick={() => isMobile && setOpenMobile(false)}
                                       isActive={isActive}
                                       tooltip={item.title}
                                    >
                                       <item.icon />
                                       <span>{item.title}</span>
                                    </SidebarMenuButton>
                                 </SidebarMenuItem>
                              );
                           })}
                     </SidebarMenu>
                  </SidebarGroupContent>
               </SidebarGroup>
            ))}
         </SidebarContent>
         <SidebarFooter>
            <NavUser user={user} />
         </SidebarFooter>
         <SidebarRail />
      </Sidebar>
   );
}
