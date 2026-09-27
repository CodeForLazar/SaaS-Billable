'use client';

import { useActionState } from 'react';
import { MailCheck } from 'lucide-react';
import { toFieldErrors } from '@/app/(auth)/_components/to-field-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue
} from '@/components/ui/select';
import type { InviteFormState } from './actions';

type InviteAction = (state: InviteFormState, formData: FormData) => Promise<InviteFormState>;

// items lets the Select show the label ("Member") in the field for the chosen value ("member").
const roleItems = [
   { value: 'member', label: 'Member' },
   { value: 'admin', label: 'Admin' }
];

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
               {/* shadcn Select (Base UI) instead of a native <select>: its list is positioned by the
                   page next to the field, so it looks and behaves the same on every device.
                   name='role' adds a hidden input, so the form still submits "role". */}
               <Select
                  key={state?.values?.role}
                  name='role'
                  items={roleItems}
                  defaultValue={state?.values?.role || 'member'}
               >
                  <SelectTrigger id='invite-role' className='w-full' aria-invalid={!!errors?.role}>
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     {roleItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                           {item.label}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
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
               <AlertDescription>
                  {state.emailed
                     ? `Invitation sent to ${state.sentTo}.`
                     : `Invitation created for ${state.sentTo}. Emails aren’t sent from the demo.`}
               </AlertDescription>
            </Alert>
         )}

         <Button type='submit' disabled={pending} className='self-start'>
            {pending ? 'Sending…' : 'Send invitation'}
         </Button>
      </form>
   );
}
