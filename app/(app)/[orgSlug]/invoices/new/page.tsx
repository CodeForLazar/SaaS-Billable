import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue
} from '@/components/ui/select';
import { formatDayRange } from '@/lib/format';
import { centsToInput, formatMoney } from '@/lib/money';
import { can } from '@/lib/permissions';
import { getTimeZone } from '@/lib/time-zone';
import { cn } from '@/lib/utils';
import { listClientOptions } from '@/server/clients';
import { listUnbilledTime } from '@/server/invoices';
import { requireMembership } from '@/server/organizations';
import { getWorkspaceSettings } from '@/server/settings';
import { createInvoiceAction } from '../actions';
import { CreateInvoiceForm } from './create-invoice-form';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/invoices/new'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `New invoice · ${organization.name}` };
}

// Two steps on one page, kept in the URL: pick a client (?clientId=...), then choose which of
// their unbilled time goes on the draft.
export default async function NewInvoicePage({
   params,
   searchParams
}: PageProps<'/[orgSlug]/invoices/new'>) {
   const { orgSlug } = await params;
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { invoice: ['create'] })) notFound();

   const [clients, unbilled, settings, timeZone] = await Promise.all([
      listClientOptions(orgSlug),
      listUnbilledTime(orgSlug),
      getWorkspaceSettings(orgSlug),
      getTimeZone()
   ]);
   const { clientId } = await searchParams;
   const client = clients.find((option) => option.id === clientId); // only a real option

   // Unbilled hours per client, for the picker's labels.
   const secondsByClient = new Map<string, number>();
   for (const row of unbilled) {
      const id = row.project.client.id;
      secondsByClient.set(id, (secondsByClient.get(id) ?? 0) + row.seconds);
   }
   const hours = (seconds: number) => centsToInput(Math.round(seconds / 36));
   const clientItems = clients.map((option) => {
      const seconds = secondsByClient.get(option.id);
      return {
         value: option.id,
         label: seconds ? `${option.name} · ${hours(seconds)} h unbilled` : option.name
      };
   });
   const basePath = `/${organization.slug}/invoices`;

   return (
      <div className='flex w-full max-w-3xl flex-1 flex-col gap-6 p-6'>
         <div>
            <h1 className='text-2xl font-semibold'>New invoice</h1>
            <p className='text-muted-foreground'>
               Start from a client&apos;s unbilled time. You can add and change lines on the draft.
            </p>
         </div>

         {clients.length === 0 ? (
            <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center'>
               <p className='font-medium'>Add a client first</p>
               <Link
                  href={`/${organization.slug}/clients/new`}
                  className={cn(buttonVariants(), 'mt-2')}
               >
                  New client
               </Link>
            </div>
         ) : (
            // A GET form: choosing a client just changes the URL (?clientId=...).
            <Form action={`${basePath}/new`} className='flex flex-wrap items-end gap-2'>
               <Field className='w-full max-w-sm'>
                  <FieldLabel htmlFor='clientId'>Client</FieldLabel>
                  <Select
                     key={client?.id}
                     name='clientId'
                     items={clientItems}
                     defaultValue={client?.id ?? null}
                  >
                     <SelectTrigger id='clientId' className='w-full'>
                        <SelectValue placeholder='Choose a client' />
                     </SelectTrigger>
                     <SelectContent>
                        {clientItems.map((item) => (
                           <SelectItem key={item.value} value={item.value}>
                              {item.label}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </Field>
               <Button type='submit' variant='outline'>
                  {client ? 'Change' : 'Continue'}
               </Button>
            </Form>
         )}

         {client && (
            <section aria-labelledby='time-heading' className='flex flex-col gap-4'>
               <h2 id='time-heading' className='text-lg font-semibold'>
                  Unbilled time for {client.name}
               </h2>
               <CreateInvoiceForm
                  action={createInvoiceAction.bind(null, organization.slug)}
                  clientId={client.id}
                  clientName={client.name}
                  rows={unbilled
                     .filter((row) => row.project.client.id === client.id)
                     .map((row) => ({
                        projectId: row.project.id,
                        projectName: row.project.name,
                        color: row.project.color,
                        hours: hours(row.seconds),
                        entries: row.entries,
                        period:
                           row.from && row.to ? formatDayRange(row.from, row.to, timeZone) : '',
                        rate:
                           row.project.hourlyRateCents === null
                              ? null
                              : formatMoney(row.project.hourlyRateCents, settings.currency),
                        amount:
                           row.amountCents === null
                              ? null
                              : formatMoney(row.amountCents, settings.currency)
                     }))}
               />
            </section>
         )}
      </div>
   );
}
