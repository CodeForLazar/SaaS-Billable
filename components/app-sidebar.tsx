'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Contact, LayoutDashboard, Users } from 'lucide-react';
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

type Workspace = { id: string; name: string; slug: string };

type Props = {
   organization: Workspace;
   role: string;
   workspaces: Workspace[];
   user: { name: string; email: string; image?: string | null };
};

// Paths are relative to the workspace (/<slug>/...). Clients, projects, time and invoices are
// added here as each of them is built, so the demo never links to a page that doesn't exist.
const navGroups = [
   {
      label: 'Workspace',
      items: [
         { title: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
         { title: 'Clients', path: 'clients', icon: Contact }
      ]
   },
   {
      label: 'Settings',
      items: [{ title: 'Members', path: 'settings/members', icon: Users }]
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
                        {group.items.map((item) => {
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
