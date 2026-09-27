'use client';

import { useTransition } from 'react';
import { ChevronsUpDown, LogOut } from 'lucide-react';
import { signOut } from '@/app/(auth)/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

type User = { name: string; email: string; image?: string | null };

// "Jane Doe" -> "JD"
function initials(name: string) {
   return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
}

function UserAvatar({ user }: { user: User }) {
   return (
      <Avatar className='size-8 rounded-md'>
         {user.image && <AvatarImage src={user.image} alt='' />}
         <AvatarFallback className='rounded-md'>{initials(user.name)}</AvatarFallback>
      </Avatar>
   );
}

// Bottom of the sidebar: who is signed in, and sign out.
export function NavUser({ user }: { user: User }) {
   const [pending, startTransition] = useTransition();

   return (
      <SidebarMenu>
         <SidebarMenuItem>
            <DropdownMenu>
               <DropdownMenuTrigger
                  render={
                     <SidebarMenuButton
                        size='lg'
                        className='data-popup-open:bg-sidebar-accent'
                        aria-label='Account menu'
                     />
                  }
               >
                  <UserAvatar user={user} />
                  <span className='grid flex-1 text-left leading-tight'>
                     <span className='truncate font-medium'>{user.name}</span>
                     <span className='truncate text-xs text-muted-foreground'>{user.email}</span>
                  </span>
                  <ChevronsUpDown className='ml-auto text-muted-foreground' />
               </DropdownMenuTrigger>
               <DropdownMenuContent align='end' side='top' className='min-w-56'>
                  <DropdownMenuGroup>
                     <DropdownMenuLabel className='flex items-center gap-2 py-1.5 font-normal'>
                        <UserAvatar user={user} />
                        <span className='grid leading-tight'>
                           <span className='truncate font-medium text-foreground'>{user.name}</span>
                           <span className='truncate text-xs'>{user.email}</span>
                        </span>
                     </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  {/* A Server Action called from a click; it redirects to /sign-in when done. */}
                  <DropdownMenuItem
                     disabled={pending}
                     onClick={() => startTransition(() => signOut())}
                  >
                     <LogOut />
                     {pending ? 'Signing out…' : 'Sign out'}
                  </DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
         </SidebarMenuItem>
      </SidebarMenu>
   );
}
