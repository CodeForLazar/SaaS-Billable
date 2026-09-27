import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Ban, CircleCheck, Download } from 'lucide-react';
import { InvoiceDocument } from '@/components/invoice-document';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import { DATE_ONLY_ZONE } from '@/utils/invoice-status';
import { formatMoney } from '@/utils/money';
import { site } from '@/utils/site';
import { cn } from '@/lib/utils';
import { getPublicInvoice } from '@/server/invoices';
import { payInvoiceAction } from './actions';
import { PayButton } from './pay-button';

// The page a client opens from the invoice email: no account, no app shell. Found by the secret
// token in the URL; anything else (unknown token, a draft) is a plain 404.
export async function generateMetadata({ params }: PageProps<'/i/[token]'>): Promise<Metadata> {
   const found = await getPublicInvoice((await params).token);
   return {
      title: found ? `Invoice ${found.view.number} from ${found.view.from.name}` : 'Invoice',
      // Private documents: keep them out of search engines, and don't leak the URL (with its
      // token) to other sites through the Referer header.
      robots: { index: false, follow: false },
      referrer: 'no-referrer'
   };
}

export default async function PublicInvoicePage({ params, searchParams }: PageProps<'/i/[token]'>) {
   const { token } = await params;
   const found = await getPublicInvoice(token);
   if (!found) notFound();
   const { invoice, view } = found;
   // Coming back from Stripe: ?payment=paid | processing (set by /paid after asking Stripe) or
   // ?payment=cancelled. Anyone can type these into the URL, so they only choose a message.
   const { payment } = await searchParams;
   const unpaid = view.status === 'sent' || view.status === 'overdue';
   const total = formatMoney(view.totalCents, view.currency);

   return (
      <div className='min-h-svh bg-muted/40'>
         <div className='mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
               <div>
                  <p className='text-sm text-muted-foreground'>Invoice from</p>
                  <h1 className='text-xl font-semibold'>{view.from.name}</h1>
               </div>
               <a href={`/i/${token}/pdf`} className={cn(buttonVariants({ variant: 'outline' }))}>
                  <Download aria-hidden='true' />
                  Download PDF
               </a>
            </div>

            {view.status === 'paid' && invoice.paidAt && (
               <Alert>
                  <CircleCheck />
                  <AlertDescription>
                     {payment === 'paid' ? 'Payment received. ' : ''}Paid on{' '}
                     {formatDate(invoice.paidAt, 'UTC')}. Thank you!
                  </AlertDescription>
               </Alert>
            )}
            {unpaid && payment === 'processing' && (
               // Paid with a slower method (e.g. a bank debit): Stripe confirms it later.
               <Alert>
                  <CircleCheck />
                  <AlertDescription>
                     Thank you! Your payment is being processed; this invoice will show as paid once
                     it&apos;s confirmed.
                  </AlertDescription>
               </Alert>
            )}
            {unpaid && payment === 'cancelled' && (
               <Alert>
                  <AlertDescription>
                     Payment cancelled: nothing was charged. You can pay whenever you&apos;re ready.
                  </AlertDescription>
               </Alert>
            )}
            {view.status === 'void' && (
               <Alert variant='destructive'>
                  <Ban />
                  <AlertDescription>
                     This invoice was cancelled and doesn&apos;t need to be paid.
                  </AlertDescription>
               </Alert>
            )}
            {unpaid && (
               <section
                  aria-label='Payment'
                  className='flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-5'
               >
                  <div>
                     <p
                        className={cn(
                           'text-sm',
                           view.status === 'overdue'
                              ? 'font-medium text-destructive'
                              : 'text-muted-foreground'
                        )}
                     >
                        {view.status === 'overdue' ? 'Overdue' : 'Amount due'}
                        {view.dueDate && ` · due ${formatDate(view.dueDate, DATE_ONLY_ZONE)}`}
                     </p>
                     <p className='text-2xl font-semibold tabular-nums'>{total}</p>
                     <p className='text-sm text-muted-foreground'>
                        Questions about this invoice?
                        {view.from.email ? ` Contact ${view.from.email}.` : ' Reply to its email.'}
                     </p>
                  </div>
                  {/* Card payment on Stripe's secure page; the invoice is marked paid automatically */}
                  <PayButton action={payInvoiceAction.bind(null, token)} label={`Pay ${total}`} />
               </section>
            )}

            <InvoiceDocument invoice={view} />

            <p className='text-center text-xs text-muted-foreground'>Sent with {site.name}</p>
         </div>
      </div>
   );
}
