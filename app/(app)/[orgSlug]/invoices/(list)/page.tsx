import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';
import { LinkTabs } from '@/components/link-tabs';
import { ListPagination } from '@/components/list-controls';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow
} from '@/components/ui/table';
import { dayKey, formatDate } from '@/lib/format';
import { DATE_ONLY_ZONE, STATUS_BADGES, STATUS_LABELS, displayStatus } from '@/lib/invoice-status';
import { formatMoney } from '@/lib/money';
import { can } from '@/lib/permissions';
import { getTimeZone, requestNow } from '@/lib/time-zone';
import { cn } from '@/lib/utils';
import {
   INVOICE_FILTERS,
   type InvoiceListQuery,
   invoiceListQuerySchema
} from '@/lib/validations/invoice';
import { listInvoices } from '@/server/invoices';
import { requireMembership } from '@/server/organizations';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/invoices'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Invoices · ${organization.name}` };
}

const FILTER_LABELS: Record<InvoiceListQuery['status'], string> = {
   all: 'All',
   draft: 'Drafts',
   sent: 'Sent',
   paid: 'Paid',
   void: 'Void'
};

export default async function InvoicesPage({
   params,
   searchParams
}: PageProps<'/[orgSlug]/invoices'>) {
   const { orgSlug } = await params;
   const { role } = await requireMembership(orgSlug);
   if (!can(role, { invoice: ['read'] })) notFound(); // members: invoices are for owners/admins
   const query = invoiceListQuerySchema.parse(await searchParams);
   const { organization, invoices, total, page, pageCount, pageSize } = await listInvoices(
      orgSlug,
      query
   );
   const todayKey = dayKey(new Date(requestNow()), await getTimeZone());
   const basePath = `/${organization.slug}/invoices`;
   const href = (status: InvoiceListQuery['status'], target = 1) => {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (target > 1) params.set('page', String(target));
      const qs = params.toString();
      return qs ? `${basePath}?${qs}` : basePath;
   };
   const newInvoiceLink = (
      <Link href={`${basePath}/new`} className={cn(buttonVariants())}>
         <Plus aria-hidden='true' />
         New invoice
      </Link>
   );

   return (
      <div className='flex w-full max-w-5xl flex-1 flex-col gap-6 p-6'>
         <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
               <h1 className='text-2xl font-semibold'>Invoices</h1>
               <p className='text-muted-foreground'>Bill your clients for your time and work.</p>
            </div>
            {newInvoiceLink}
         </div>

         <LinkTabs
            label='Filter by status'
            tabs={INVOICE_FILTERS.map((status) => ({
               href: href(status),
               label: FILTER_LABELS[status],
               current: query.status === status
            }))}
         />

         {invoices.length === 0 ? (
            <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center'>
               <FileText className='size-8 text-muted-foreground' aria-hidden='true' />
               <p className='font-medium'>
                  {query.status === 'all'
                     ? 'No invoices yet'
                     : `No ${FILTER_LABELS[query.status].toLowerCase()} invoices`}
               </p>
               {query.status === 'all' && (
                  <>
                     <p className='text-sm text-muted-foreground'>
                        Turn your unbilled time into an invoice in a few clicks.
                     </p>
                     <div className='mt-2'>{newInvoiceLink}</div>
                  </>
               )}
            </div>
         ) : (
            <>
               <Table>
                  <TableHeader>
                     <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead className='hidden sm:table-cell'>Client</TableHead>
                        <TableHead className='hidden md:table-cell'>Issued</TableHead>
                        <TableHead className='hidden md:table-cell'>Due</TableHead>
                        <TableHead className='text-right'>Total</TableHead>
                        <TableHead className='text-right'>Status</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {invoices.map((invoice) => {
                        const status = displayStatus(invoice, todayKey);
                        return (
                           <TableRow key={invoice.id}>
                              <TableCell>
                                 <Link
                                    href={`${basePath}/${invoice.id}`}
                                    className='font-medium underline-offset-4 hover:underline'
                                 >
                                    {invoice.number ?? 'Draft'}
                                 </Link>
                                 <div className='text-xs text-muted-foreground sm:hidden'>
                                    {invoice.client.name}
                                 </div>
                              </TableCell>
                              <TableCell className='hidden sm:table-cell'>
                                 {invoice.client.name}
                              </TableCell>
                              <TableCell className='hidden text-muted-foreground md:table-cell'>
                                 {invoice.issueDate
                                    ? formatDate(invoice.issueDate, DATE_ONLY_ZONE)
                                    : '—'}
                              </TableCell>
                              <TableCell className='hidden text-muted-foreground md:table-cell'>
                                 {invoice.dueDate
                                    ? formatDate(invoice.dueDate, DATE_ONLY_ZONE)
                                    : '—'}
                              </TableCell>
                              <TableCell className='text-right tabular-nums'>
                                 {formatMoney(invoice.totalCents, invoice.currency)}
                              </TableCell>
                              <TableCell className='text-right'>
                                 <Badge variant={STATUS_BADGES[status]}>
                                    {STATUS_LABELS[status]}
                                 </Badge>
                              </TableCell>
                           </TableRow>
                        );
                     })}
                  </TableBody>
               </Table>
               <ListPagination
                  pageHref={(target) => href(query.status, target)}
                  page={page}
                  pageCount={pageCount}
                  pageSize={pageSize}
                  total={total}
                  noun={['invoice', 'invoices']}
               />
            </>
         )}
      </div>
   );
}
