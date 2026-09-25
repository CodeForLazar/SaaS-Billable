'use server';

import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { signInSchema, signUpSchema } from '@/lib/validations/auth';

// What a form action sends back to the form: a general error, per-field errors,
// and the values the user typed (React resets the form after an action, so we refill it).
export type AuthFormState =
   | {
        error?: string;
        fieldErrors?: { name?: string[]; email?: string[]; password?: string[] };
        values?: { name?: string; email?: string };
     }
   | undefined;

export async function signUp(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
   const input = Object.fromEntries(formData);
   const values = { name: String(input.name ?? ''), email: String(input.email ?? '') };

   const parsed = signUpSchema.safeParse(input);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }

   try {
      // Creates the user and emails a verification link. No session yet: that happens when the link
      // is clicked. The link lands on callbackURL (/sign-in forwards signed-in users to the app).
      // An already-registered email gets the same response, so this form can't reveal who has an account.
      await auth.api.signUpEmail({ body: { ...parsed.data, callbackURL: '/sign-in' }, headers: await headers() });
   } catch (error) {
      if (error instanceof APIError) return { error: error.message, values };
      throw error;
   }

   // redirect() works by throwing, so it must stay outside the try/catch.
   redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function signIn(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
   const input = Object.fromEntries(formData);
   const values = { email: String(input.email ?? '') };

   const parsed = signInSchema.safeParse(input);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }

   try {
      await auth.api.signInEmail({ body: { ...parsed.data, callbackURL: '/sign-in' }, headers: await headers() });
   } catch (error) {
      if (error instanceof APIError) {
         // Better Auth has just emailed a fresh verification link (sendOnSignIn).
         if (error.body?.code === 'EMAIL_NOT_VERIFIED') {
            return { error: 'Please confirm your email first. We just sent you a new link.', values };
         }
         return { error: error.message, values };
      }
      throw error;
   }

   redirect('/dashboard');
}

export async function signOut() {
   await auth.api.signOut({ headers: await headers() });
   redirect('/sign-in');
}
