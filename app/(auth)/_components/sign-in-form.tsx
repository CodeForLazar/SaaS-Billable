'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { signIn } from '../actions';
import { toFieldErrors } from './to-field-errors';

// redirectTo: where to go after signing in (e.g. back to an invitation). defaultEmail pre-fills the field.
export function SignInForm({ redirectTo, defaultEmail }: { redirectTo?: string | null; defaultEmail?: string }) {
   const [state, formAction, pending] = useActionState(signIn, undefined);
   const errors = state?.fieldErrors;

   return (
      <form action={formAction} noValidate>
         {redirectTo && <input type='hidden' name='redirectTo' value={redirectTo} />}
         <FieldGroup>
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
               <div className='flex items-center justify-between'>
                  <FieldLabel htmlFor='password'>Password</FieldLabel>
                  <Link
                     href='/forgot-password'
                     className='text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
                  >
                     Forgot password?
                  </Link>
               </div>
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
