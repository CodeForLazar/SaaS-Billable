import { TZDate } from '@date-fns/tz';
import { addDays, addWeeks, startOfWeek, subWeeks } from 'date-fns';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { ColorDot } from '@/components/color-dot';
import { buttonVariants } from '@/components/ui/button';
import {
   Table,
   TableBody,
   TableCaption,
   TableCell,
   TableFooter,
   TableHead,
   TableHeader,
   TableRow
} from '@/components/ui/table';
import { dayKey, formatDayRange, formatDuration, formatIn } from '@/lib/format';
import { getTimeZone, requestNow } from '@/lib/time-zone';
import { cn } from '@/lib/utils';
import { weekQuerySchema } from '@/lib/validations/time-entry';
import { requireMembership } from '@/server/organizations';
import { listMyEntriesBetween } from '@/server/time-entries';
import { TimeTabs } from '../time-tabs';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/time/week'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Timesheet · ${organization.name}` };
}

// The weekly timesheet: my hours per project (rows) and day (Monday to Sunday), with totals.
// ?week=<any day of that week>; without it, this week. Weeks are computed on the user's clock.
export default async function WeekPage({
   params,
   searchParams
}: PageProps<'/[orgSlug]/time/week'>) {
   const { orgSlug } = await params;
   const { organization } = await requireMembership(orgSlug);
   const { week } = weekQuerySchema.parse(await searchParams);
   const timeZone = await getTimeZone();

   // TZDate: dates whose calendar (Monday, midnight...) is the user's, so date-fns works in their zone.
   const today = new TZDate(requestNow(), timeZone);
   // Any day of the requested week ("2026-09-23"), or today. TZDate's month is 0-based like Date's.
   const [year, month, day] = week?.split('-').map(Number) ?? [];
   const anchor = week ? new TZDate(year, month - 1, day, timeZone) : today;
   const monday = startOfWeek(anchor, { weekStartsOn: 1 }); // Monday 00:00, user's clock
   const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
   const dayKeys = days.map((day) => dayKey(day, timeZone));
   const todayKey = dayKey(today, timeZone);
   const isThisWeek = dayKeys.includes(todayKey);

   // Plain Dates (UTC instants) for the query: Monday 00:00 up to next Monday 00:00, user's clock.
   const entries = await listMyEntriesBetween(
      orgSlug,
      new Date(monday.getTime()),
      new Date(addWeeks(monday, 1).getTime())
   );

   // Rows: one per project, seconds per day. Entries count for the day they started on.
   type Row = {
      project: (typeof entries)[number]['project'];
      perDay: number[];
      total: number;
   };
   const rows = new Map<string, Row>();
   const perDay = [0, 0, 0, 0, 0, 0, 0];
   let billable = 0;
   for (const entry of entries) {
      const index = dayKeys.indexOf(dayKey(entry.startedAt, timeZone));
      if (index === -1) continue; // can't happen with the query's range; guards against surprises
      const seconds = entry.durationSec ?? 0;
      let row = rows.get(entry.project.id);
      if (!row) {
         row = { project: entry.project, perDay: [0, 0, 0, 0, 0, 0, 0], total: 0 };
         rows.set(entry.project.id, row);
      }
      row.perDay[index] += seconds;
      row.total += seconds;
      perDay[index] += seconds;
      if (entry.billable) billable += seconds;
   }
   const sortedRows = [...rows.values()].sort(
      (a, b) =>
         a.project.client.name.localeCompare(b.project.client.name) ||
         a.project.name.localeCompare(b.project.name)
   );
   const total = perDay.reduce((sum, seconds) => sum + seconds, 0);

   const basePath = `/${organization.slug}/time/week`;
   const weekHref = (day: Date) => `${basePath}?week=${dayKey(day, timeZone)}`;
   const range = formatDayRange(monday, days[6], timeZone);
   const cell = (seconds: number) =>
      seconds ? formatDuration(seconds) : <span className='text-muted-foreground/60'>—</span>;

   return (
      <div className='flex w-full max-w-5xl flex-1 flex-col gap-6 p-6'>
         <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
               <h1 className='text-2xl font-semibold'>Time</h1>
               <p className='text-muted-foreground'>Your hours per project and day.</p>
            </div>
            <TimeTabs orgSlug={organization.slug} current='week' />
         </div>

         <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-2'>
               <Link
                  href={weekHref(subWeeks(monday, 1))}
                  className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
                  aria-label='Previous week'
               >
                  <ChevronLeft aria-hidden='true' />
               </Link>
               <Link
                  href={weekHref(addWeeks(monday, 1))}
                  className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
                  aria-label='Next week'
               >
                  <ChevronRight aria-hidden='true' />
               </Link>
               <h2 className='font-semibold'>{range}</h2>
               {!isThisWeek && (
                  <Link
                     href={basePath}
                     className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                  >
                     This week
                  </Link>
               )}
            </div>
            <p className='text-sm text-muted-foreground'>
               Total{' '}
               <span className='font-medium text-foreground tabular-nums'>
                  {formatDuration(total)}
               </span>
               {' · '}billable{' '}
               <span className='font-medium text-foreground tabular-nums'>
                  {formatDuration(billable)}
               </span>
            </p>
         </div>

         {sortedRows.length === 0 ? (
            <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center'>
               <CalendarDays className='size-8 text-muted-foreground' aria-hidden='true' />
               <p className='font-medium'>No time tracked this week</p>
               <Link
                  href={`/${organization.slug}/time`}
                  className='text-sm underline underline-offset-4'
               >
                  Track or add time
               </Link>
            </div>
         ) : (
            <>
               {/* From md up: the grid. 9 columns don't fit a phone, so phones get a day list below.
                   The wrapper is hidden, not the table: Table renders its own container div. */}
               <div className='hidden md:block'>
                  <Table>
                     <TableCaption className='sr-only'>
                        Hours per project and day, {range}
                     </TableCaption>
                     <TableHeader>
                        <TableRow>
                           <TableHead>Project</TableHead>
                           {days.map((day, index) => (
                              <TableHead
                                 key={dayKeys[index]}
                                 aria-current={dayKeys[index] === todayKey ? 'date' : undefined}
                                 className={cn(
                                    'w-16 text-right',
                                    dayKeys[index] === todayKey && 'bg-muted/60 text-foreground'
                                 )}
                              >
                                 <div>{formatIn(day, 'EEE', timeZone)}</div>
                                 <div className='text-xs font-normal text-muted-foreground'>
                                    {formatIn(day, 'd', timeZone)}
                                 </div>
                              </TableHead>
                           ))}
                           <TableHead className='w-20 text-right'>Total</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {sortedRows.map((row) => (
                           <TableRow key={row.project.id}>
                              <TableCell>
                                 <div className='flex items-center gap-2 font-medium'>
                                    <ColorDot color={row.project.color} />
                                    {row.project.name}
                                 </div>
                                 <div className='pl-4.5 text-xs text-muted-foreground'>
                                    {row.project.client.name}
                                 </div>
                              </TableCell>
                              {row.perDay.map((seconds, index) => (
                                 <TableCell
                                    key={dayKeys[index]}
                                    className={cn(
                                       'text-right tabular-nums',
                                       dayKeys[index] === todayKey && 'bg-muted/60'
                                    )}
                                 >
                                    {cell(seconds)}
                                 </TableCell>
                              ))}
                              <TableCell className='text-right font-medium tabular-nums'>
                                 {formatDuration(row.total)}
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                     <TableFooter>
                        <TableRow>
                           <TableCell className='font-medium'>Total</TableCell>
                           {perDay.map((seconds, index) => (
                              <TableCell
                                 key={dayKeys[index]}
                                 className={cn(
                                    'text-right font-medium tabular-nums',
                                    dayKeys[index] === todayKey && 'bg-muted'
                                 )}
                              >
                                 {cell(seconds)}
                              </TableCell>
                           ))}
                           <TableCell className='text-right font-semibold tabular-nums'>
                              {formatDuration(total)}
                           </TableCell>
                        </TableRow>
                     </TableFooter>
                  </Table>
               </div>

               {/* Phones: one block per day with its projects. */}
               <ul className='flex flex-col gap-3 md:hidden' aria-label={`Hours per day, ${range}`}>
                  {days.map((day, index) => (
                     <li
                        key={dayKeys[index]}
                        className={cn(
                           'rounded-lg border',
                           dayKeys[index] === todayKey && 'border-primary'
                        )}
                     >
                        <div className='flex items-center justify-between px-4 py-2 text-sm font-medium'>
                           <span>
                              {formatIn(day, 'EEE, MMM d', timeZone)}
                              {dayKeys[index] === todayKey && (
                                 <span className='font-normal text-muted-foreground'> · today</span>
                              )}
                           </span>
                           <span className='tabular-nums'>{cell(perDay[index])}</span>
                        </div>
                        {perDay[index] > 0 && (
                           <ul className='border-t px-4 py-2 text-sm'>
                              {sortedRows
                                 .filter((row) => row.perDay[index] > 0)
                                 .map((row) => (
                                    <li
                                       key={row.project.id}
                                       className='flex items-center justify-between gap-2 py-1'
                                    >
                                       <span className='flex min-w-0 items-center gap-2'>
                                          <ColorDot color={row.project.color} />
                                          <span className='truncate'>{row.project.name}</span>
                                       </span>
                                       <span className='tabular-nums'>
                                          {formatDuration(row.perDay[index])}
                                       </span>
                                    </li>
                                 ))}
                           </ul>
                        )}
                     </li>
                  ))}
               </ul>
            </>
         )}
      </div>
   );
}
