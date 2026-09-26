'use client';

import { useActionState } from 'react';
import { MailCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { requestPasswordReset } from '../actions';
import { toFieldErrors } from './to-field-errors';

export function ForgotPasswordForm() {
   const [state, formAction, pending] = useActionState(requestPasswordReset, undefined);
   const errors = state?.fieldErrors;

   // Same message whether or not the account exists: we can't tell the user which it is.
   if (state?.success) {
      return (
         <Alert>
            <MailCheck />
            <AlertTitle>Check your email</AlertTitle>
            <AlertDescription>
               If an account exists for {state.values?.email}, we sent a link to reset your
               password. It expires in 1 hour.
            </AlertDescription>
         </Alert>
      );
   }

   return (
      <form action={formAction} noValidate>
         <FieldGroup>
            <Field data-invalid={!!errors?.email}>
               <FieldLabel htmlFor='email'>Email</FieldLabel>
               <Input
                  key={state?.values?.email}
                  id='email'
                  name='email'
                  type='email'
                  autoComplete='email'
                  defaultValue={state?.values?.email}
                  aria-invalid={!!errors?.email}
               />
               <FieldError errors={toFieldErrors(errors?.email)} />
            </Field>

            <Button type='submit' disabled={pending}>
               {pending ? 'Sending…' : 'Send reset link'}
            </Button>
         </FieldGroup>
      </form>
   );
}
