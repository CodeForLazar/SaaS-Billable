import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Ban, BellRing, CircleCheck, Download, Mail, Trash2 } from 'lucide-react';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { InvoiceDocument } from '@/components/invoice-document';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatTime } from '@/lib/format';
import { DATE_ONLY_ZONE } from '@/utils/invoice-status';
import { basisPointsToPercent, centsToInput, formatMoney } from '@/utils/money';
import { getTimeZone } from '@/lib/time-zone';
import { cn } from '@/lib/utils';
import { getInvoice, getInvoiceView, publicInvoiceUrl } from '@/server/invoices';
import { listInvoicePayments } from '@/server/payments';
import { getWorkspaceSettings } from '@/server/settings';
import {
   addLineAction,
   deleteDraftAction,
   deleteLineAction,
   markPaidAction,
   resendInvoiceAction,
   sendInvoiceAction,
   sendReminderAction,
   updateDetailsAction,
   updateLineAction,
   voidInvoiceAction
} from '../actions';
import { DetailsForm } from './details-form';
import { AddLineButton, LineActions } from './line-actions';
import { SendDialog } from './send-dialog';
import { ShareLink } from './share-link';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/invoices/[invoiceId]'>): Promise<Metadata> {
   const { orgSlug, invoiceId } = await params;
   const { organization, invoice } = await getInvoice(orgSlug, invoiceId);
   return { title: `${invoice.number ?? 'Draft invoice'} · ${organization.name}` };
}

export default async function InvoicePage({
   params
}: PageProps<'/[orgSlug]/invoices/[invoiceId]'>) {
   const { orgSlug, invoiceId } = await params;
   // 404 for members (no invoice rights), other workspaces' and unknown invoices.
   const { organization, invoice, view } = await getInvoiceView(orgSlug, invoiceId);
   const [settings, payments, timeZone] = await Promise.all([
      getWorkspaceSettings(orgSlug),
      listInvoicePayments(organization.id, invoice.id),
      getTimeZone()
   ]);
   const slug = organization.slug;
   const basePath = `/${slug}/invoices`;
   const draft = invoice.status === 'DRAFT';
   const linesById = new Map(invoice.lines.map((line) => [line.id, line]));
   const overdue = view.status === 'overdue';
   const dueDate = invoice.dueDate ? formatDate(invoice.dueDate, DATE_ONLY_ZONE) : '';

   return (
      <div className='flex w-full max-w-4xl flex-1 flex-col gap-6 p-6'>
         <Link
            href={basePath}
            className='flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
         >
            <ArrowLeft className='size-4' aria-hidden='true' />
            All invoices
         </Link>

         <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
               <h1 className='text-2xl font-semibold'>{invoice.number ?? 'Draft invoice'}</h1>
               <Link
                  href={`/${slug}/clients/${invoice.client.id}`}
                  className='text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
               >
                  {invoice.client.name}
               </Link>
            </div>

            {/* What can be done depends on the status: DRAFT -> SENT -> PAID, or SENT -> VOID. */}
            <div className='flex flex-wrap gap-2'>
               <a
                  href={`${basePath}/${invoice.id}/pdf`}
                  className={cn(buttonVariants({ variant: 'outline' }))}
               >
                  <Download aria-hidden='true' />
                  PDF
               </a>
               {draft && (
                  <>
                     <ConfirmActionButton
                        action={deleteDraftAction.bind(null, slug, invoice.id)}
                        title='Delete this draft?'
                        description='The draft is removed and its time becomes unbilled again.'
                        confirmLabel='Delete draft'
                        pendingLabel='Deleting…'
                        destructive
                     >
                        <Trash2 aria-hidden='true' />
                        Delete
                     </ConfirmActionButton>
                     <SendDialog
                        action={sendInvoiceAction.bind(null, slug, invoice.id)}
                        clientEmail={invoice.client.email}
                        nextNumber={`${settings.invoicePrefix}${String(settings.nextInvoiceNumber).padStart(4, '0')}`}
                        paymentTermsDays={invoice.paymentTermsDays}
                     />
                  </>
               )}
               {invoice.status === 'SENT' && (
                  <>
                     <ConfirmActionButton
                        action={voidInvoiceAction.bind(null, slug, invoice.id)}
                        title={`Void ${invoice.number}?`}
                        description='The invoice is cancelled but kept (with its number) for your records. Its time becomes unbilled again, so it can go on a corrected invoice.'
                        confirmLabel='Void invoice'
                        pendingLabel='Voiding…'
                        successMessage='Invoice voided.'
                        destructive
                     >
                        <Ban aria-hidden='true' />
                        Void
                     </ConfirmActionButton>
                     {invoice.billToEmail && (
                        <ConfirmActionButton
                           action={sendReminderAction.bind(null, slug, invoice.id)}
                           title='Send a payment reminder?'
                           description={`A friendly reminder goes to ${invoice.billToEmail}: the invoice ${overdue ? `was due on ${dueDate} and is overdue` : `is due on ${dueDate}`}. The PDF and the payment link are included. At most one reminder per day.`}
                           confirmLabel='Send reminder'
                           pendingLabel='Sending…'
                           successMessage={`Reminder sent to ${invoice.billToEmail}.`}
                        >
                           <BellRing aria-hidden='true' />
                           Send reminder
                        </ConfirmActionButton>
                     )}
                     {invoice.billToEmail && (
                        <ConfirmActionButton
                           action={resendInvoiceAction.bind(null, slug, invoice.id)}
                           title='Email the invoice again?'
                           description={`It goes to ${invoice.billToEmail}, with the PDF attached.`}
                           confirmLabel='Send email'
                           pendingLabel='Sending…'
                           successMessage={`Invoice emailed to ${invoice.billToEmail}.`}
                        >
                           <Mail aria-hidden='true' />
                           Resend email
                        </ConfirmActionButton>
                     )}
                     <ConfirmActionButton
                        action={markPaidAction.bind(null, slug, invoice.id)}
                        variant='default'
                        title={`Mark ${invoice.number} as paid?`}
                        description='Use this when the client paid another way (bank transfer, cash...). Online payments will mark it automatically.'
                        confirmLabel='Mark as paid'
                        pendingLabel='Saving…'
                        successMessage='Invoice marked as paid.'
                     >
                        <CircleCheck aria-hidden='true' />
                        Mark as paid
                     </ConfirmActionButton>
                  </>
               )}
            </div>
         </div>

         {draft && (
            <p className='rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground'>
               This is a draft: only your team can see it. Check the lines, then send it. It gets
               its number when sent.
            </p>
         )}

         {invoice.status === 'SENT' && (overdue || invoice.lastReminderAt) && (
            <p
               className={cn(
                  'rounded-lg border px-4 py-3 text-sm',
                  overdue ? 'border-destructive/40 text-destructive' : 'text-muted-foreground'
               )}
            >
               {overdue && `Overdue since ${dueDate}. `}
               {invoice.lastReminderAt
                  ? `Last reminder sent ${formatDate(invoice.lastReminderAt, timeZone)} at ${formatTime(invoice.lastReminderAt, timeZone)}${invoice.reminderCount > 1 ? ` (${invoice.reminderCount} reminders so far)` : ''}.`
                  : invoice.billToEmail
                    ? 'No reminder sent yet.'
                    : 'Add an email address to the client to send reminders, or contact them directly.'}
            </p>
         )}

         <InvoiceDocument
            invoice={view}
            lineActions={
               draft
                  ? (line) => {
                       const record = linesById.get(line.id);
                       return (
                          <LineActions
                             line={{
                                description: line.description,
                                values: {
                                   description: line.description,
                                   quantity: centsToInput(line.quantityHundredths),
                                   unitPrice: centsToInput(line.unitPriceCents)
                                }
                             }}
                             updateAction={updateLineAction.bind(null, slug, invoice.id, line.id)}
                             deleteAction={deleteLineAction.bind(null, slug, invoice.id, line.id)}
                             currency={invoice.currency}
                             billsTime={(record?._count.timeEntries ?? 0) > 0}
                          />
                       );
                    }
                  : undefined
            }
         />

         {draft && (
            <>
               <div>
                  <AddLineButton
                     action={addLineAction.bind(null, slug, invoice.id)}
                     currency={invoice.currency}
                  />
               </div>
               <Card>
                  <CardHeader>
                     <CardTitle>Invoice details</CardTitle>
                     <CardDescription>
                        Tax, payment terms and notes for this invoice.
                     </CardDescription>
                  </CardHeader>
                  <CardContent>
                     <DetailsForm
                        action={updateDetailsAction.bind(null, slug, invoice.id)}
                        defaultValues={{
                           taxRate: basisPointsToPercent(invoice.taxRateBasisPoints),
                           paymentTermsDays: String(invoice.paymentTermsDays),
                           notes: invoice.notes ?? ''
                        }}
                     />
                  </CardContent>
               </Card>
            </>
         )}

         {payments.length > 0 && (
            <Card>
               <CardHeader>
                  <CardTitle>Payments</CardTitle>
                  <CardDescription>Received online by card (Stripe).</CardDescription>
               </CardHeader>
               <CardContent>
                  <ul className='divide-y text-sm'>
                     {payments.map((payment) => (
                        <li key={payment.id} className='flex justify-between gap-4 py-2'>
                           <span>
                              {formatDate(payment.paidAt, timeZone)},{' '}
                              {formatTime(payment.paidAt, timeZone)}
                           </span>
                           <span className='font-medium tabular-nums'>
                              {formatMoney(payment.amountCents, payment.currency)}
                           </span>
                        </li>
                     ))}
                  </ul>
               </CardContent>
            </Card>
         )}

         {invoice.publicToken && invoice.status !== 'VOID' && (
            <Card>
               <CardHeader>
                  <CardTitle>Client link</CardTitle>
                  <CardDescription>
                     Your client can view and download the invoice here, without an account.
                  </CardDescription>
               </CardHeader>
               <CardContent>
                  <ShareLink url={publicInvoiceUrl(invoice.publicToken)} />
               </CardContent>
            </Card>
         )}
      </div>
   );
}
