'use server';

import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from '@/lib/validations/auth';

// What a form action sends back to the form: a general error, per-field errors, the values the
// user typed (React resets the form after an action, so we refill it), and a success flag for
// forms that stay on the page.
export type AuthFormState =
   | {
        error?: string;
        fieldErrors?: { name?: string[]; email?: string[]; password?: string[]; confirmPassword?: string[] };
        values?: { name?: string; email?: string };
        success?: boolean;
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

export async function requestPasswordReset(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
   const input = Object.fromEntries(formData);
   const values = { email: String(input.email ?? '') };

   const parsed = forgotPasswordSchema.safeParse(input);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }

   // Emails a link that leads to /reset-password?token=... Unknown emails get the same response,
   // so the form can't be used to find out who has an account.
   await auth.api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo: '/reset-password' },
      headers: await headers()
   });

   return { success: true, values };
}

export async function resetPassword(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
   const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
   }

   try {
      // The token is single-use. Afterwards every session of this user is revoked (see lib/auth.ts).
      await auth.api.resetPassword({
         body: { token: parsed.data.token, newPassword: parsed.data.password },
         headers: await headers()
      });
   } catch (error) {
      if (error instanceof APIError) {
         if (error.body?.code === 'INVALID_TOKEN') {
            return { error: 'This reset link is invalid or has already been used. Please request a new one.' };
         }
         return { error: error.message };
      }
      throw error;
   }

   redirect('/sign-in?reset=success');
}

export async function signOut() {
   await auth.api.signOut({ headers: await headers() });
   redirect('/sign-in');
}
