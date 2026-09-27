import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Ban, CircleCheck, Download } from 'lucide-react';
import { InvoiceDocument } from '@/components/invoice-document';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { site } from '@/lib/site';
import { cn } from '@/lib/utils';
import { getPublicInvoice } from '@/server/invoices';

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

export default async function PublicInvoicePage({ params }: PageProps<'/i/[token]'>) {
   const { token } = await params;
   const found = await getPublicInvoice(token);
   if (!found) notFound();
   const { invoice, view } = found;

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
                     Paid on {formatDate(invoice.paidAt, 'UTC')}. Thank you!
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
            {(view.status === 'sent' || view.status === 'overdue') && (
               <Alert variant={view.status === 'overdue' ? 'destructive' : 'default'}>
                  <AlertDescription>
                     {formatMoney(view.totalCents, view.currency)} is due
                     {view.status === 'overdue' ? ' (overdue)' : ''}. Questions about this invoice?
                     {view.from.email ? ` Contact ${view.from.email}.` : ' Reply to its email.'}
                  </AlertDescription>
               </Alert>
            )}

            <InvoiceDocument invoice={view} />

            <p className='text-center text-xs text-muted-foreground'>Sent with {site.name}</p>
         </div>
      </div>
   );
}
