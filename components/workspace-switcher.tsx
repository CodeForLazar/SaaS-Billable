'use client';

import Link from 'next/link';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuLabel,
   DropdownMenuLinkItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

type Workspace = { id: string; name: string; slug: string };

// The data comes from the server as props; this component only handles the dropdown.
// Switching is plain navigation to another workspace URL: the URL decides the workspace,
// and the workspace layout remembers it for the next sign-in.
export function WorkspaceSwitcher({
   current,
   workspaces
}: {
   current: Workspace;
   workspaces: Workspace[];
}) {
   return (
      <DropdownMenu>
         <DropdownMenuTrigger
            render={<Button variant='outline' className='w-56 justify-between' />}
         >
            <span className='truncate'>{current.name}</span>
            <ChevronsUpDown className='text-muted-foreground' />
         </DropdownMenuTrigger>
         <DropdownMenuContent className='w-56'>
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
   );
}
