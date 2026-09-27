'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { toFieldErrors } from '@/app/(auth)/_components/to-field-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ClientFormState } from './actions';

type ClientAction = (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
type ClientValues = NonNullable<NonNullable<ClientFormState>['values']>;

const empty: ClientValues = { name: '', company: '', email: '', address: '', notes: '' };

// Used by both "New client" and "Edit client". The page passes the Server Action with the
// workspace (and client) already bound, the starting values, and where Cancel goes.
export function ClientForm({
   action,
   defaultValues = empty,
   submitLabel,
   cancelHref
}: {
   action: ClientAction;
   defaultValues?: ClientValues;
   submitLabel: string;
   cancelHref: string;
}) {
   const [state, formAction, pending] = useActionState(action, undefined);
   const errors = state?.fieldErrors;
   // After a failed save, show what was typed (React resets the form when an action finishes).
   // key={value} remounts an input when its value changes, see the decision log.
   const values = state?.values ?? defaultValues;

   return (
      <form action={formAction} noValidate>
         <FieldGroup>
            <div className='grid gap-6 sm:grid-cols-2'>
               <Field data-invalid={!!errors?.name}>
                  <FieldLabel htmlFor='name'>Name</FieldLabel>
                  <Input
                     key={values.name}
                     id='name'
                     name='name'
                     placeholder='Jane Cooper'
                     defaultValue={values.name}
                     aria-invalid={!!errors?.name}
                  />
                  <FieldError errors={toFieldErrors(errors?.name)} />
               </Field>
               <Field data-invalid={!!errors?.company}>
                  <FieldLabel htmlFor='company'>Company</FieldLabel>
                  <Input
                     key={values.company}
                     id='company'
                     name='company'
                     placeholder='Optional'
                     autoComplete='off'
                     defaultValue={values.company}
                     aria-invalid={!!errors?.company}
                  />
                  <FieldError errors={toFieldErrors(errors?.company)} />
               </Field>
            </div>

            <Field data-invalid={!!errors?.email}>
               <FieldLabel htmlFor='email'>Email</FieldLabel>
               <Input
                  key={values.email}
                  id='email'
                  name='email'
                  type='email'
                  placeholder='jane@example.com'
                  autoComplete='off'
                  defaultValue={values.email}
                  aria-invalid={!!errors?.email}
               />
               <FieldDescription>Invoices are sent to this address.</FieldDescription>
               <FieldError errors={toFieldErrors(errors?.email)} />
            </Field>

            <Field data-invalid={!!errors?.address}>
               <FieldLabel htmlFor='address'>Billing address</FieldLabel>
               <Textarea
                  key={values.address}
                  id='address'
                  name='address'
                  rows={3}
                  placeholder={'Street and number\nPostcode and city\nCountry'}
                  defaultValue={values.address}
                  aria-invalid={!!errors?.address}
               />
               <FieldDescription>Printed on invoices, line by line.</FieldDescription>
               <FieldError errors={toFieldErrors(errors?.address)} />
            </Field>

            <Field data-invalid={!!errors?.notes}>
               <FieldLabel htmlFor='notes'>Notes</FieldLabel>
               <Textarea
                  key={values.notes}
                  id='notes'
                  name='notes'
                  rows={4}
                  defaultValue={values.notes}
                  aria-invalid={!!errors?.notes}
               />
               <FieldDescription>Only visible to your workspace.</FieldDescription>
               <FieldError errors={toFieldErrors(errors?.notes)} />
            </Field>

            {state?.error && (
               <Alert variant='destructive'>
                  <AlertDescription>{state.error}</AlertDescription>
               </Alert>
            )}

            <div className='flex gap-2'>
               <Button type='submit' disabled={pending}>
                  {pending ? 'Saving…' : submitLabel}
               </Button>
               <Link href={cancelHref} className={cn(buttonVariants({ variant: 'outline' }))}>
                  Cancel
               </Link>
            </div>
         </FieldGroup>
      </form>
   );
}
