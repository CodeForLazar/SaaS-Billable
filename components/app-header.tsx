'use client';

import { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

// URL segment -> label. Unknown segments (e.g. record ids later) are left out of the trail.
const labels: Record<string, string> = {
   dashboard: 'Dashboard',
   clients: 'Clients',
   projects: 'Projects',
   time: 'Time',
   new: 'New',
   edit: 'Edit',
   settings: 'Settings',
   members: 'Members'
};

// Top bar of every workspace page: sidebar toggle + where you are ("Settings / Members"), and on
// the right whatever the layout passes in (the running timer).
export function AppHeader({ children }: { children?: React.ReactNode }) {
   const pathname = usePathname();
   // "/acme/settings/members" -> ["Settings", "Members"] (the first segment is the workspace slug)
   const trail = pathname
      .split('/')
      .slice(2)
      .map((segment) => labels[segment])
      .filter(Boolean);

   return (
      <header className='flex h-14 shrink-0 items-center gap-2 border-b px-4'>
         <SidebarTrigger className='-ml-1' />
         {/* Base UI marks it data-vertical (Radix-based examples use data-[orientation=vertical]) */}
         <Separator
            orientation='vertical'
            className='mr-2 data-vertical:h-4 data-vertical:self-center'
         />
         <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-sm'>
            {trail.map((label, index) => (
               <Fragment key={label}>
                  {index > 0 && <span className='text-muted-foreground'>/</span>}
                  <span
                     className={
                        index === trail.length - 1 ? 'font-medium' : 'text-muted-foreground'
                     }
                  >
                     {label}
                  </span>
               </Fragment>
            ))}
         </nav>
         {children}
      </header>
   );
}
