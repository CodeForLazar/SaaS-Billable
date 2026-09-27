'use client';

import Link from 'next/link';
import { ColorDot } from '@/components/color-dot';
import { Elapsed } from '@/components/elapsed';
import { StopTimerButton } from '@/components/stop-timer-button';

export type RunningTimerData = {
   startedAt: Date;
   project: { name: string; color: string | null };
   organization: { name: string; slug: string };
};

// The running timer in the header of every workspace page: project, live duration, Stop.
// It links to the Time page of the workspace the timer runs in (which may be another one).
export function RunningTimer({
   timer,
   renderedAt,
   currentOrgSlug
}: {
   timer: RunningTimerData;
   renderedAt: number;
   currentOrgSlug: string;
}) {
   const elsewhere = timer.organization.slug !== currentOrgSlug;

   return (
      <div className='ml-auto flex min-w-0 items-center gap-2 text-sm'>
         <Link
            href={`/${timer.organization.slug}/time`}
            className='flex min-w-0 items-center gap-2 rounded-md px-2 py-1 hover:bg-muted'
         >
            <ColorDot color={timer.project.color} className='motion-safe:animate-pulse' />
            <span className='sr-only'>Timer running:</span>
            {/* The project name is only read out on phones (no room to show it) */}
            <span className='sr-only sm:not-sr-only sm:max-w-48 sm:truncate'>
               {timer.project.name}
               {elsewhere && (
                  <span className='text-muted-foreground'> · {timer.organization.name}</span>
               )}
            </span>
            <Elapsed startedAt={timer.startedAt} renderedAt={renderedAt} />
         </Link>
         <StopTimerButton compact />
      </div>
   );
}
