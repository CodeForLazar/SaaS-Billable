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
      // Creates the user and, through the nextCookies plugin, sets the session cookie.
      await auth.api.signUpEmail({ body: parsed.data, headers: await headers() });
   } catch (error) {
      if (error instanceof APIError) return { error: error.message, values };
      throw error;
   }

   // redirect() works by throwing, so it must stay outside the try/catch.
   redirect('/dashboard');
}

export async function signIn(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
   const input = Object.fromEntries(formData);
   const values = { email: String(input.email ?? '') };

   const parsed = signInSchema.safeParse(input);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }

   try {
      await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
   } catch (error) {
      if (error instanceof APIError) return { error: error.message, values };
      throw error;
   }

   redirect('/dashboard');
}

export async function signOut() {
   await auth.api.signOut({ headers: await headers() });
   redirect('/sign-in');
}
