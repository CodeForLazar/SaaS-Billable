import Link from 'next/link';
import { cn } from '@/lib/utils';

// Tabs that are links: each tab is its own URL (bookmarkable, back button works), rendered on the
// server. Used for Active/Archived on lists and Entries/Week on the Time pages.
export function LinkTabs({
   label,
   tabs
}: {
   /** What the tabs switch between, for screen readers ("Filter by status"). */
   label: string;
   tabs: { href: string; label: string; current: boolean }[];
}) {
   return (
      <nav aria-label={label} className='flex w-fit gap-1 rounded-lg bg-muted p-1'>
         {tabs.map((tab) => (
            <Link
               key={tab.href}
               href={tab.href}
               aria-current={tab.current ? 'page' : undefined}
               className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  tab.current && 'bg-background text-foreground shadow-sm'
               )}
            >
               {tab.label}
            </Link>
         ))}
      </nav>
   );
}
