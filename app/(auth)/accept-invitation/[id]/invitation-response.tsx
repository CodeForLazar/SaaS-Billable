'use client';

import { useActionState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { InvitationActionState } from './actions';

type Action = () => Promise<InvitationActionState>;

// One form, two buttons: each button submits the form to its own Server Action (formAction).
export function InvitationResponse({ accept, decline }: { accept: Action; decline: Action }) {
   const [acceptState, acceptAction, accepting] = useActionState(accept, undefined);
   const [declineState, declineAction, declining] = useActionState(decline, undefined);
   const error = acceptState?.error ?? declineState?.error;
   const busy = accepting || declining;

   return (
      <form className='flex flex-col gap-4'>
         {error && (
            <Alert variant='destructive'>
               <AlertDescription>{error}</AlertDescription>
            </Alert>
         )}
         <div className='flex gap-2'>
            {/* type='submit' matters: Base UI's Button defaults to type='button', which never submits */}
            <Button type='submit' formAction={acceptAction} disabled={busy} className='flex-1'>
               {accepting ? 'Joining…' : 'Accept invitation'}
            </Button>
            <Button type='submit' formAction={declineAction} disabled={busy} variant='outline'>
               {declining ? 'Declining…' : 'Decline'}
            </Button>
         </div>
      </form>
   );
}
