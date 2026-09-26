'use client';

import { useActionState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { signUp } from '../actions';
import { toFieldErrors } from './to-field-errors';

// redirectTo: where to go after signing in (e.g. back to an invitation). defaultEmail pre-fills the field.
export function SignUpForm({
   redirectTo,
   defaultEmail
}: {
   redirectTo?: string | null;
   defaultEmail?: string;
}) {
   // state = whatever signUp() returned last time; pending = true while it runs on the server
   const [state, formAction, pending] = useActionState(signUp, undefined);
   const errors = state?.fieldErrors;
   // Inputs refilled from state get key={value}: a changed value mounts a fresh input instead of
   // changing defaultValue on the existing one (which Base UI warns about).

   return (
      <form action={formAction} noValidate>
         {redirectTo && <input type='hidden' name='redirectTo' value={redirectTo} />}
         <FieldGroup>
            <Field data-invalid={!!errors?.name}>
               <FieldLabel htmlFor='name'>Name</FieldLabel>
               <Input
                  key={state?.values?.name}
                  id='name'
                  name='name'
                  autoComplete='name'
                  defaultValue={state?.values?.name}
                  aria-invalid={!!errors?.name}
               />
               <FieldError errors={toFieldErrors(errors?.name)} />
            </Field>

            <Field data-invalid={!!errors?.email}>
               <FieldLabel htmlFor='email'>Email</FieldLabel>
               <Input
                  key={state?.values?.email ?? defaultEmail}
                  id='email'
                  name='email'
                  type='email'
                  autoComplete='email'
                  defaultValue={state?.values?.email ?? defaultEmail}
                  aria-invalid={!!errors?.email}
               />
               <FieldError errors={toFieldErrors(errors?.email)} />
            </Field>

            <Field data-invalid={!!errors?.password}>
               <FieldLabel htmlFor='password'>Password</FieldLabel>
               <Input
                  id='password'
                  name='password'
                  type='password'
                  autoComplete='new-password'
                  aria-invalid={!!errors?.password}
               />
               <FieldError errors={toFieldErrors(errors?.password)} />
            </Field>

            {state?.error && (
               <Alert variant='destructive'>
                  <AlertDescription>{state.error}</AlertDescription>
               </Alert>
            )}

            <Button type='submit' disabled={pending}>
               {pending ? 'Creating account…' : 'Create account'}
            </Button>
         </FieldGroup>
      </form>
   );
}
