'use client';

import { useActionState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { signIn } from '../actions';
import { toFieldErrors } from './to-field-errors';

export function SignInForm() {
   const [state, formAction, pending] = useActionState(signIn, undefined);
   const errors = state?.fieldErrors;

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

            <Field data-invalid={!!errors?.password}>
               <FieldLabel htmlFor='password'>Password</FieldLabel>
               <Input
                  id='password'
                  name='password'
                  type='password'
                  autoComplete='current-password'
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
               {pending ? 'Signing in…' : 'Sign in'}
            </Button>
         </FieldGroup>
      </form>
   );
}
