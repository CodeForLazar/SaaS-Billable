'use client';

import { useActionState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { CreateInvoiceState } from '../actions';

type CreateAction = (state: CreateInvoiceState, formData: FormData) => Promise<CreateInvoiceState>;

export type UnbilledRow = {
   projectId: string;
   projectName: string;
   color: string | null;
   hours: string; // "6.50"
   entries: number;
   period: string; // "Sep 1 – 27, 2026"
   rate: string | null; // "$75.00", null = no rate on the project
   amount: string | null;
};

// Tick the projects whose unbilled time goes on the draft (all by default). Each ticked checkbox
// submits one "projectId" field; the server re-reads the time itself, it never trusts totals
// from the browser.
export function CreateInvoiceForm({
   action,
   clientId,
   clientName,
   rows
}: {
   action: CreateAction;
   clientId: string;
   clientName: string;
   rows: UnbilledRow[];
}) {
   const [state, formAction, pending] = useActionState(action, undefined);
   const missingRates = rows.filter((row) => row.rate === null).length;

   return (
      <form action={formAction} className='flex flex-col gap-4'>
         <input type='hidden' name='clientId' value={clientId} />

         {rows.length === 0 ? (
            <p className='rounded-lg border border-dashed p-6 text-sm text-muted-foreground'>
               {clientName} has no unbilled time. The draft starts empty: add lines by hand (a fixed
               fee, expenses...).
            </p>
         ) : (
            <fieldset className='flex flex-col rounded-lg border'>
               <legend className='sr-only'>Unbilled time to include</legend>
               {rows.map((row) => (
                  <label
                     key={row.projectId}
                     className='flex cursor-pointer items-start gap-3 border-b p-4 last:border-b-0 hover:bg-muted/40'
                  >
                     <Checkbox
                        name='projectId'
                        value={row.projectId}
                        defaultChecked
                        className='mt-0.5'
                     />
                     <span className='min-w-0 flex-1'>
                        <span className='flex items-center gap-2 font-medium'>
                           <span
                              aria-hidden='true'
                              className='inline-block size-2.5 rounded-full bg-muted-foreground'
                              style={row.color ? { backgroundColor: row.color } : undefined}
                           />
                           {row.projectName}
                        </span>
                        <span className='block text-sm text-muted-foreground'>
                           {row.entries} {row.entries === 1 ? 'entry' : 'entries'} · {row.period}
                        </span>
                     </span>
                     <span className='text-right text-sm tabular-nums'>
                        <span className='block font-medium'>{row.hours} h</span>
                        <span className='block text-muted-foreground'>
                           {row.rate ? `× ${row.rate} = ${row.amount}` : 'No rate set'}
                        </span>
                     </span>
                  </label>
               ))}
            </fieldset>
         )}

         {missingRates > 0 && (
            <Alert>
               <TriangleAlert />
               <AlertDescription>
                  {missingRates === 1 ? 'A project has' : `${missingRates} projects have`} no hourly
                  rate: {missingRates === 1 ? 'its line starts' : 'their lines start'} at 0. You can
                  set the price on the draft.
               </AlertDescription>
            </Alert>
         )}
         {(state?.error || state?.clientError) && (
            <Alert variant='destructive'>
               <AlertDescription>{state.clientError ?? state.error}</AlertDescription>
            </Alert>
         )}

         <Button type='submit' disabled={pending} className='self-start'>
            {pending ? 'Creating…' : 'Create draft invoice'}
         </Button>
      </form>
   );
}
