import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { DATE_ONLY_ZONE, STATUS_BADGES, STATUS_LABELS } from '@/lib/invoice-status';
import type { InvoiceView } from '@/lib/invoice-view';
import { basisPointsToPercent, centsToInput, formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

// The invoice as a document ("the paper"): used on the app's invoice page and on the public page
// the client opens. A Server Component; `lineActions` lets the app page add an edit menu per line
// on drafts.
export function InvoiceDocument({
   invoice,
   lineActions,
   className
}: {
   invoice: InvoiceView;
   lineActions?: (line: InvoiceView['lines'][number]) => React.ReactNode;
   className?: string;
}) {
   const money = (cents: number) => formatMoney(cents, invoice.currency);
   // Issue and due dates are calendar dates (no time of day): shown as stored, in UTC.
   const day = (date: Date) => formatDate(date, DATE_ONLY_ZONE);

   return (
      <article
         className={cn('flex flex-col gap-8 rounded-lg border bg-card p-6 sm:p-10', className)}
         aria-label={invoice.number ? `Invoice ${invoice.number}` : 'Draft invoice'}
      >
         <header className='flex flex-wrap items-start justify-between gap-6'>
            <div className='min-w-0'>
               <p className='text-lg font-semibold'>{invoice.from.name}</p>
               {invoice.from.address && (
                  <p className='text-sm whitespace-pre-line text-muted-foreground'>
                     {invoice.from.address}
                  </p>
               )}
               {invoice.from.email && (
                  <p className='text-sm text-muted-foreground'>{invoice.from.email}</p>
               )}
            </div>
            <div className='text-left sm:text-right'>
               <div className='flex items-center gap-2 sm:justify-end'>
                  <h2 className='text-2xl font-semibold tracking-tight'>Invoice</h2>
                  <Badge variant={STATUS_BADGES[invoice.status]}>
                     {STATUS_LABELS[invoice.status]}
                  </Badge>
               </div>
               <p className='text-sm text-muted-foreground'>
                  {invoice.number ?? 'Number given when sent'}
               </p>
            </div>
         </header>

         <div className='grid gap-6 text-sm sm:grid-cols-3'>
            <div className='min-w-0'>
               <p className='text-muted-foreground'>Billed to</p>
               <p className='font-medium'>{invoice.billTo.name}</p>
               {invoice.billTo.address && (
                  <p className='whitespace-pre-line'>{invoice.billTo.address}</p>
               )}
               {invoice.billTo.email && <p className='break-all'>{invoice.billTo.email}</p>}
            </div>
            <div>
               <p className='text-muted-foreground'>Issued</p>
               <p>{invoice.issueDate ? day(invoice.issueDate) : 'When sent'}</p>
            </div>
            <div>
               <p className='text-muted-foreground'>Due</p>
               <p className={cn(invoice.status === 'overdue' && 'font-medium text-destructive')}>
                  {invoice.dueDate
                     ? day(invoice.dueDate)
                     : `${invoice.paymentTermsDays} days after sending`}
               </p>
            </div>
         </div>

         <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
               <thead>
                  <tr className='border-b text-left text-muted-foreground'>
                     <th className='py-2 pr-4 font-medium'>Description</th>
                     <th className='py-2 pr-4 text-right font-medium'>Qty</th>
                     <th className='hidden py-2 pr-4 text-right font-medium sm:table-cell'>
                        Price
                     </th>
                     <th className='py-2 text-right font-medium'>Amount</th>
                     {lineActions && <th className='w-10' aria-label='Actions' />}
                  </tr>
               </thead>
               <tbody>
                  {invoice.lines.length === 0 && (
                     <tr>
                        <td colSpan={5} className='py-6 text-center text-muted-foreground'>
                           No lines yet.
                        </td>
                     </tr>
                  )}
                  {invoice.lines.map((line) => (
                     <tr key={line.id} className='border-b align-top'>
                        <td className='py-3 pr-4'>
                           <span className='whitespace-pre-line'>{line.description}</span>
                           <span className='block text-xs text-muted-foreground sm:hidden'>
                              {centsToInput(line.quantityHundredths)} × {money(line.unitPriceCents)}
                           </span>
                        </td>
                        <td className='py-3 pr-4 text-right tabular-nums'>
                           {centsToInput(line.quantityHundredths)}
                        </td>
                        <td className='hidden py-3 pr-4 text-right tabular-nums sm:table-cell'>
                           {money(line.unitPriceCents)}
                        </td>
                        <td className='py-3 text-right tabular-nums'>{money(line.amountCents)}</td>
                        {lineActions && (
                           <td className='py-2 pl-2 text-right'>{lineActions(line)}</td>
                        )}
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         <dl className='ml-auto grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm'>
            <dt className='text-muted-foreground'>Subtotal</dt>
            <dd className='text-right tabular-nums'>{money(invoice.subtotalCents)}</dd>
            {invoice.taxRateBasisPoints > 0 && (
               <>
                  <dt className='text-muted-foreground'>
                     Tax ({basisPointsToPercent(invoice.taxRateBasisPoints)}%)
                  </dt>
                  <dd className='text-right tabular-nums'>{money(invoice.taxCents)}</dd>
               </>
            )}
            <dt className='mt-2 border-t pt-2 font-semibold'>Total</dt>
            <dd className='mt-2 border-t pt-2 text-right text-base font-semibold tabular-nums'>
               {money(invoice.totalCents)}
            </dd>
         </dl>

         {invoice.notes && (
            <div className='text-sm'>
               <p className='text-muted-foreground'>Notes</p>
               <p className='whitespace-pre-line'>{invoice.notes}</p>
            </div>
         )}
      </article>
   );
}
