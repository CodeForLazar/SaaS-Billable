'use client';

import Link from 'next/link';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuLabel,
   DropdownMenuLinkItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

type Workspace = { id: string; name: string; slug: string };

function WorkspaceBadge({ name }: { name: string }) {
   return (
      <span className='flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground'>
         {name.charAt(0).toUpperCase()}
      </span>
   );
}

// Top of the sidebar. The data comes from the server as props; this component only handles the
// dropdown. Switching is plain navigation to another workspace URL: the URL decides the workspace,
// and the workspace layout remembers it for the next sign-in.
export function WorkspaceSwitcher({
   current,
   role,
   workspaces
}: {
   current: Workspace;
   role: string;
   workspaces: Workspace[];
}) {
   return (
      <SidebarMenu>
         <SidebarMenuItem>
            <DropdownMenu>
               <DropdownMenuTrigger
                  render={
                     <SidebarMenuButton
                        size='lg'
                        className='data-popup-open:bg-sidebar-accent'
                        aria-label='Switch workspace'
                     />
                  }
               >
                  <WorkspaceBadge name={current.name} />
                  <span className='grid flex-1 text-left leading-tight'>
                     <span className='truncate font-medium'>{current.name}</span>
                     <span className='truncate text-xs text-muted-foreground capitalize'>
                        {role}
                     </span>
                  </span>
                  <ChevronsUpDown className='ml-auto text-muted-foreground' />
               </DropdownMenuTrigger>
               <DropdownMenuContent align='start' className='min-w-56'>
                  <DropdownMenuGroup>
                     <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                     {workspaces.map((workspace) => (
                        <DropdownMenuLinkItem
                           key={workspace.id}
                           render={<Link href={`/${workspace.slug}/dashboard`} />}
                        >
                           <span className='flex-1 truncate'>{workspace.name}</span>
                           {workspace.id === current.id && <Check />}
                        </DropdownMenuLinkItem>
                     ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLinkItem render={<Link href='/create-workspace' />}>
                     <Plus />
                     Create workspace
                  </DropdownMenuLinkItem>
               </DropdownMenuContent>
            </DropdownMenu>
         </SidebarMenuItem>
      </SidebarMenu>
   );
}
