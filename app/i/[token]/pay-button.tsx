'use client';

import { useActionState } from 'react';
import { CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { PayState } from './actions';

// "Pay €330.00 by card": a form, so it works before JavaScript loads too.
export function PayButton({
   action,
   label
}: {
   action: (state: PayState) => Promise<PayState>;
   label: string;
}) {
   const [state, formAction, pending] = useActionState(action, undefined);
   return (
      <form action={formAction} className='flex flex-col items-start gap-2'>
         <Button type='submit' size='lg' disabled={pending}>
            <CreditCard aria-hidden='true' />
            {pending ? 'Opening secure payment…' : label}
         </Button>
         {state?.error && (
            <Alert variant='destructive'>
               <AlertDescription>{state.error}</AlertDescription>
            </Alert>
         )}
      </form>
   );
}
