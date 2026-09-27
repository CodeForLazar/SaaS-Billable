import { LinkTabs } from '@/components/link-tabs';

/** Entries (day by day, add/edit) or Week (the timesheet grid). */
export function TimeTabs({ orgSlug, current }: { orgSlug: string; current: 'entries' | 'week' }) {
   return (
      <LinkTabs
         label='Time views'
         tabs={[
            { href: `/${orgSlug}/time`, label: 'Entries', current: current === 'entries' },
            { href: `/${orgSlug}/time/week`, label: 'Week', current: current === 'week' }
         ]}
      />
   );
}
