'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { resetPassword } from '../actions';
import { toFieldErrors } from './to-field-errors';

export function ResetPasswordForm({ token }: { token: string }) {
   const [state, formAction, pending] = useActionState(resetPassword, undefined);
   const errors = state?.fieldErrors;

   return (
      <form action={formAction} noValidate>
         {/* The token from the email link travels with the form; the server checks it. */}
         <input type='hidden' name='token' value={token} />
         <FieldGroup>
            <Field data-invalid={!!errors?.password}>
               <FieldLabel htmlFor='password'>New password</FieldLabel>
               <Input
                  id='password'
                  name='password'
                  type='password'
                  autoComplete='new-password'
                  aria-invalid={!!errors?.password}
               />
               <FieldError errors={toFieldErrors(errors?.password)} />
            </Field>

            <Field data-invalid={!!errors?.confirmPassword}>
               <FieldLabel htmlFor='confirmPassword'>Confirm new password</FieldLabel>
               <Input
                  id='confirmPassword'
                  name='confirmPassword'
                  type='password'
                  autoComplete='new-password'
                  aria-invalid={!!errors?.confirmPassword}
               />
               <FieldError errors={toFieldErrors(errors?.confirmPassword)} />
            </Field>

            {state?.error && (
               <Alert variant='destructive'>
                  <AlertDescription>
                     {state.error}{' '}
                     <Link
                        href='/forgot-password'
                        className='font-medium underline underline-offset-4'
                     >
                        Request a new link
                     </Link>
                  </AlertDescription>
               </Alert>
            )}

            <Button type='submit' disabled={pending}>
               {pending ? 'Saving…' : 'Set new password'}
            </Button>
         </FieldGroup>
      </form>
   );
}
