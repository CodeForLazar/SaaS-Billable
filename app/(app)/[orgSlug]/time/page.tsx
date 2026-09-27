import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { ColorDot } from '@/components/color-dot';
import { Elapsed } from '@/components/elapsed';
import { StopTimerButton } from '@/components/stop-timer-button';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dayKey, formatDuration, formatTime, formatWeekday } from '@/lib/format';
import { can } from '@/lib/permissions';
import { getTimeZone, requestNow } from '@/lib/time-zone';
import { cn } from '@/lib/utils';
import { requireMembership } from '@/server/organizations';
import { getRunningTimer, listMyRecentEntries, listTrackableProjects } from '@/server/time-entries';
import { startTimerAction } from './actions';
import { StartTimerForm } from './start-timer-form';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/time'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Time · ${organization.name}` };
}

export default async function TimePage({ params }: PageProps<'/[orgSlug]/time'>) {
   const { orgSlug } = await params;
   const { organization, role } = await requireMembership(orgSlug);
   const [timer, entries, projects, timeZone] = await Promise.all([
      getRunningTimer(),
      listMyRecentEntries(orgSlug),
      listTrackableProjects(orgSlug),
      getTimeZone()
   ]);
   const timerHere = timer?.organization.slug === organization.slug ? timer : null;

   // Projects grouped by client for the picker (already sorted by client, then project).
   const groups: { client: string; projects: { value: string; label: string }[] }[] = [];
   for (const project of projects) {
      const last = groups.at(-1);
      const item = { value: project.id, label: project.name };
      if (last?.client === project.client.name) last.projects.push(item);
      else groups.push({ client: project.client.name, projects: [item] });
   }

   // Entries grouped by calendar day in the user's time zone, with a total per day.
   const days: { key: string; label: string; totalSec: number; entries: typeof entries }[] = [];
   const now = requestNow();
   const today = dayKey(new Date(now), timeZone);
   const yesterday = dayKey(new Date(now - 24 * 60 * 60 * 1000), timeZone);
   for (const entry of entries) {
      const key = dayKey(entry.startedAt, timeZone);
      let day = days.at(-1);
      if (day?.key !== key) {
         const label =
            key === today
               ? 'Today'
               : key === yesterday
                 ? 'Yesterday'
                 : formatWeekday(entry.startedAt, timeZone);
         day = { key, label, totalSec: 0, entries: [] };
         days.push(day);
      }
      day.entries.push(entry);
      day.totalSec += entry.durationSec ?? 0;
   }

   return (
      <div className='flex w-full max-w-5xl flex-1 flex-col gap-6 p-6'>
         <div>
            <h1 className='text-2xl font-semibold'>Time</h1>
            <p className='text-muted-foreground'>Track the time you spend on your projects.</p>
         </div>

         <Card>
            <CardHeader>
               <CardTitle>{timerHere ? 'Timer running' : 'Start a timer'}</CardTitle>
            </CardHeader>
            <CardContent>
               {timerHere ? (
                  <div className='flex flex-wrap items-center justify-between gap-4'>
                     <div className='min-w-0'>
                        <div className='flex items-center gap-2 font-medium'>
                           <ColorDot color={timerHere.project.color} />
                           {timerHere.project.name}
                           <span className='font-normal text-muted-foreground'>
                              · {timerHere.project.client.name}
                           </span>
                        </div>
                        <p className='text-sm text-muted-foreground'>
                           {timerHere.description ?? 'No description'} · started{' '}
                           {formatTime(timerHere.startedAt, timeZone)}
                        </p>
                     </div>
                     <div className='flex items-center gap-4'>
                        <span className='text-3xl font-semibold'>
                           <Elapsed startedAt={timerHere.startedAt} renderedAt={now} />
                        </span>
                        <StopTimerButton />
                     </div>
                  </div>
               ) : projects.length === 0 ? (
                  <div className='flex flex-col items-start gap-2'>
                     <p className='text-sm text-muted-foreground'>
                        Time is tracked on projects. There are no active projects yet.
                     </p>
                     {can(role, { project: ['create'] }) && (
                        <Link
                           href={`/${organization.slug}/projects/new`}
                           className={cn(buttonVariants({ variant: 'outline' }))}
                        >
                           New project
                        </Link>
                     )}
                  </div>
               ) : (
                  <StartTimerForm
                     action={startTimerAction.bind(null, organization.slug)}
                     groups={groups}
                     note={
                        timer
                           ? `Your timer on ${timer.project.name} in ${timer.organization.name} is still running. Starting one here stops it.`
                           : undefined
                     }
                  />
               )}
            </CardContent>
         </Card>

         <section aria-labelledby='recent-heading' className='flex flex-col gap-4'>
            <h2 id='recent-heading' className='text-lg font-semibold'>
               Last 14 days
            </h2>
            {days.length === 0 ? (
               <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center'>
                  <Clock className='size-8 text-muted-foreground' aria-hidden='true' />
                  <p className='font-medium'>No time tracked yet</p>
                  <p className='text-sm text-muted-foreground'>
                     Start a timer above; finished entries show up here.
                  </p>
               </div>
            ) : (
               days.map((day) => (
                  <div key={day.key} className='rounded-lg border'>
                     <div className='flex items-center justify-between border-b bg-muted/50 px-4 py-2 text-sm font-medium'>
                        <h3>{day.label}</h3>
                        <span className='tabular-nums'>{formatDuration(day.totalSec)}</span>
                     </div>
                     <ul className='divide-y'>
                        {day.entries.map((entry) => (
                           <li
                              key={entry.id}
                              className='flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm'
                           >
                              <div className='min-w-0 flex-1'>
                                 <p className='truncate'>
                                    {entry.description ?? (
                                       <span className='text-muted-foreground'>No description</span>
                                    )}
                                 </p>
                                 <p className='flex items-center gap-1.5 text-muted-foreground'>
                                    <ColorDot color={entry.project.color} />
                                    <span className='truncate'>
                                       {entry.project.name} · {entry.project.client.name}
                                    </span>
                                 </p>
                              </div>
                              {!entry.billable && <Badge variant='outline'>Non-billable</Badge>}
                              <span className='text-muted-foreground tabular-nums'>
                                 {formatTime(entry.startedAt, timeZone)}–
                                 {entry.endedAt && formatTime(entry.endedAt, timeZone)}
                              </span>
                              <span className='w-12 text-right font-medium tabular-nums'>
                                 {formatDuration(entry.durationSec ?? 0)}
                              </span>
                           </li>
                        ))}
                     </ul>
                  </div>
               ))
            )}
         </section>
      </div>
   );
}
