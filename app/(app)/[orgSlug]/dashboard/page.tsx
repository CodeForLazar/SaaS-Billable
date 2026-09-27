import type { Metadata } from 'next';
import Link from 'next/link';
import {
   Card,
   CardAction,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle
} from '@/components/ui/card';
import {
   Table,
   TableBody,
   TableCell,
   TableFooter,
   TableHead,
   TableHeader,
   TableRow
} from '@/components/ui/table';
import { formatDuration, formatIn } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { getTimeZone } from '@/lib/time-zone';
import { getDashboard } from '@/server/dashboard';
import { requireMembership } from '@/server/organizations';
import { HoursChart, type ProjectHours } from './hours-chart';
import { RevenueChart, type RevenueMonth } from './revenue-chart';

// params is a Promise in Next.js 16. requireMembership is cached, so calling it here and in
// the page costs one database lookup.
export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/dashboard'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Dashboard · ${organization.name}` };
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** A number card: a label, a big value and a line of context. */
function Stat({
   label,
   value,
   children,
   href
}: {
   label: string;
   value: string;
   children?: React.ReactNode;
   href?: string;
}) {
   return (
      <Card size='sm'>
         <CardHeader>
            <CardDescription>{label}</CardDescription>
            <p className='text-2xl font-semibold tabular-nums'>{value}</p>
            {href && (
               <CardAction>
                  <Link
                     href={href}
                     className='text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
                  >
                     View
                  </Link>
               </CardAction>
            )}
         </CardHeader>
         {children && (
            <CardContent className='text-sm text-muted-foreground'>{children}</CardContent>
         )}
      </Card>
   );
}

// The layout's SidebarInset is the page's <main>, so pages use a plain <div>.
export default async function DashboardPage({ params }: PageProps<'/[orgSlug]/dashboard'>) {
   const { orgSlug } = await params;
   const timeZone = await getTimeZone();
   const { organization, finances, hours, money } = await getDashboard(orgSlug, timeZone);
   const slug = organization.slug;
   const monthName = formatIn(hours.monthStart, 'MMMM', timeZone);
   const who = finances ? 'Team' : 'Your';

   // Chart data, prepared here: labels in the user's time zone, plain numbers and strings only
   // (props passed to a Client Component must be serializable, like JSON in an API response).
   const revenueData: RevenueMonth[] =
      money?.revenue.map((row) => ({
         key: formatIn(row.month, 'yyyy-MM', timeZone),
         label: formatIn(row.month, 'MMM', timeZone),
         title: formatIn(row.month, 'MMMM yyyy', timeZone),
         cents: row.cents,
         count: row.count
      })) ?? [];
   const revenueTotal = money?.revenue.reduce((sum, row) => sum + row.cents, 0) ?? 0;
   const paidCount = money?.revenue.reduce((sum, row) => sum + row.count, 0) ?? 0;
   const hoursData: ProjectHours[] = hours.perProject.map((row) => ({
      key: row.project.id,
      name: row.project.name,
      client: row.project.client.name,
      billable: row.billableSeconds / 3600,
      nonBillable: (row.seconds - row.billableSeconds) / 3600
   }));

   return (
      <div className='flex w-full max-w-6xl flex-1 flex-col gap-6 p-6'>
         <div>
            <h1 className='text-2xl font-semibold'>Dashboard</h1>
            <p className='text-muted-foreground'>
               {organization.name} in {formatIn(hours.monthStart, 'MMMM yyyy', timeZone)}
            </p>
         </div>

         <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {money && (
               <>
                  <Stat
                     label='Outstanding'
                     value={formatMoney(money.outstanding.cents, money.currency)}
                     href={`/${slug}/invoices?status=sent`}
                  >
                     {money.outstanding.count === 0 ? (
                        'Nothing waiting to be paid.'
                     ) : (
                        <>
                           {plural(money.outstanding.count, 'unpaid invoice')}
                           {money.overdue.count > 0 && (
                              <span className='block font-medium text-destructive'>
                                 {formatMoney(money.overdue.cents, money.currency)} overdue (
                                 {money.overdue.count})
                              </span>
                           )}
                        </>
                     )}
                  </Stat>
                  <Stat
                     label={`Paid in ${monthName}`}
                     value={formatMoney(money.revenue.at(-1)!.cents, money.currency)}
                  >
                     {formatMoney(money.revenue.at(-2)!.cents, money.currency)} in{' '}
                     {formatIn(money.revenue.at(-2)!.month, 'MMMM', timeZone)}
                  </Stat>
                  <Stat
                     label='Ready to invoice'
                     value={formatMoney(money.unbilled.cents, money.currency)}
                     href={`/${slug}/invoices/new`}
                  >
                     {formatDuration(money.unbilled.seconds)} h of unbilled billable time
                     {money.unbilled.withoutRate > 0 && (
                        <span className='block'>
                           {plural(money.unbilled.withoutRate, 'project')} without a rate not
                           counted
                        </span>
                     )}
                  </Stat>
               </>
            )}
            <Stat
               label={`${who} hours in ${monthName}`}
               value={`${formatDuration(hours.totalSeconds)} h`}
               href={`/${slug}/time`}
            >
               {formatDuration(hours.billableSeconds)} h billable
            </Stat>
         </div>

         <div className='grid gap-4 lg:grid-cols-2'>
            {money && (
               <Card>
                  <CardHeader>
                     <CardTitle>Revenue per month</CardTitle>
                     <CardDescription>
                        {formatMoney(revenueTotal, money.currency)} from{' '}
                        {plural(paidCount, 'paid invoice')} in the last {money.revenue.length}{' '}
                        months.
                     </CardDescription>
                  </CardHeader>
                  <CardContent>
                     {paidCount === 0 ? (
                        <p className='text-sm text-muted-foreground'>
                           Paid invoices show up here, in the month they were paid.
                        </p>
                     ) : (
                        <RevenueChart data={revenueData} currency={money.currency} />
                     )}
                     {/* The same numbers as a table for screen readers (charts are pictures). */}
                     <Table className='sr-only'>
                        <caption>Revenue per month</caption>
                        <TableHeader>
                           <TableRow>
                              <TableHead>Month</TableHead>
                              <TableHead className='text-right'>Invoices</TableHead>
                              <TableHead className='text-right'>Paid</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                           {money.revenue.toReversed().map((row) => (
                              <TableRow key={row.month.toISOString()}>
                                 <TableCell>{formatIn(row.month, 'MMMM yyyy', timeZone)}</TableCell>
                                 <TableCell className='text-right tabular-nums'>
                                    {row.count}
                                 </TableCell>
                                 <TableCell className='text-right tabular-nums'>
                                    {formatMoney(row.cents, money.currency)}
                                 </TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                        <TableFooter>
                           <TableRow>
                              <TableCell>Total</TableCell>
                              <TableCell className='text-right tabular-nums'>
                                 {money.revenue.reduce((sum, row) => sum + row.count, 0)}
                              </TableCell>
                              <TableCell className='text-right tabular-nums'>
                                 {formatMoney(
                                    money.revenue.reduce((sum, row) => sum + row.cents, 0),
                                    money.currency
                                 )}
                              </TableCell>
                           </TableRow>
                        </TableFooter>
                     </Table>
                  </CardContent>
               </Card>
            )}

            <Card className='self-start'>
               <CardHeader>
                  <CardTitle>Hours per project</CardTitle>
                  <CardDescription>
                     {finances ? 'Everyone’s' : 'Your'} tracked time in {monthName}.
                  </CardDescription>
               </CardHeader>
               <CardContent>
                  {hours.perProject.length === 0 ? (
                     <p className='text-sm text-muted-foreground'>
                        No time tracked in {monthName} yet.{' '}
                        <Link
                           href={`/${slug}/time`}
                           className='text-foreground underline underline-offset-4'
                        >
                           Start a timer
                        </Link>
                     </p>
                  ) : (
                     <>
                        <HoursChart data={hoursData} />
                        <Table className='sr-only'>
                           <caption>Hours per project</caption>
                           <TableHeader>
                              <TableRow>
                                 <TableHead>Project</TableHead>
                                 <TableHead className='text-right'>Billable</TableHead>
                                 <TableHead className='text-right'>Hours</TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                              {hours.perProject.map(({ project, seconds, billableSeconds }) => (
                                 <TableRow key={project.id}>
                                    <TableCell>
                                       {project.name} ({project.client.name})
                                    </TableCell>
                                    <TableCell className='text-right tabular-nums'>
                                       {formatDuration(billableSeconds)}
                                    </TableCell>
                                    <TableCell className='text-right tabular-nums'>
                                       {formatDuration(seconds)}
                                    </TableCell>
                                 </TableRow>
                              ))}
                           </TableBody>
                        </Table>
                     </>
                  )}
               </CardContent>
            </Card>
         </div>

         {money && money.otherCurrencies.length > 0 && (
            <p className='text-sm text-muted-foreground'>
               Totals are in {money.currency}. Invoices in {money.otherCurrencies.join(', ')} are
               not included.
            </p>
         )}
      </div>
   );
}
