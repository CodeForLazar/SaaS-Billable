'use client';

import { useActionState } from 'react';
import { MailCheck } from 'lucide-react';
import { toFieldErrors } from '@/app/(auth)/_components/to-field-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { InviteFormState } from './actions';

type InviteAction = (state: InviteFormState, formData: FormData) => Promise<InviteFormState>;

// The page passes the Server Action with the workspace slug already bound to it.
export function InviteForm({ action }: { action: InviteAction }) {
   const [state, formAction, pending] = useActionState(action, undefined);
   const errors = state?.fieldErrors;

   return (
      <form action={formAction} noValidate className='flex flex-col gap-4'>
         <div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
            <Field data-invalid={!!errors?.email} className='flex-1'>
               <FieldLabel htmlFor='invite-email'>Email</FieldLabel>
               <Input
                  key={state?.values?.email}
                  id='invite-email'
                  name='email'
                  type='email'
                  placeholder='teammate@example.com'
                  defaultValue={state?.values?.email}
                  aria-invalid={!!errors?.email}
               />
               <FieldError errors={toFieldErrors(errors?.email)} />
            </Field>
            <Field data-invalid={!!errors?.role} className='sm:w-36'>
               <FieldLabel htmlFor='invite-role'>Role</FieldLabel>
               <NativeSelect
                  key={state?.values?.role}
                  id='invite-role'
                  name='role'
                  defaultValue={state?.values?.role || 'member'}
                  aria-invalid={!!errors?.role}
               >
                  <NativeSelectOption value='member'>Member</NativeSelectOption>
                  <NativeSelectOption value='admin'>Admin</NativeSelectOption>
               </NativeSelect>
               <FieldError errors={toFieldErrors(errors?.role)} />
            </Field>
         </div>

         {state?.error && (
            <Alert variant='destructive'>
               <AlertDescription>{state.error}</AlertDescription>
            </Alert>
         )}
         {state?.sentTo && (
            <Alert>
               <MailCheck />
               <AlertDescription>Invitation sent to {state.sentTo}.</AlertDescription>
            </Alert>
         )}

         <Button type='submit' disabled={pending} className='self-start'>
            {pending ? 'Sending…' : 'Send invitation'}
         </Button>
      </form>
   );
}
