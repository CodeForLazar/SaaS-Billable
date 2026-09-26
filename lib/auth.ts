import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { organization } from 'better-auth/plugins';
import { after } from 'next/server';
import { createElement } from 'react';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/mailer';
import ResetPasswordEmail from '@/emails/reset-password';
import VerifyEmail from '@/emails/verify-email';

// BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment automatically.
export const auth = betterAuth({
   database: prismaAdapter(db, { provider: 'postgresql' }),
   user: {
      additionalFields: {
         // The workspace the user was last in, so sign-in can take them back to it.
         // Set by the server (app/(app)/[orgSlug]/layout.tsx); input: false means clients can't set it.
         lastActiveOrganizationId: { type: 'string', required: false, input: false }
      }
   },
   emailAndPassword: {
      enabled: true,
      // No session until the email is confirmed. Sign-in with an unverified email is rejected.
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 60 * 60, // seconds
      sendResetPassword: async ({ user, url }) => {
         await sendEmail({
            to: user.email,
            subject: 'Reset your password',
            react: createElement(ResetPasswordEmail, { name: user.name, url })
         });
      },
      // After a reset, sign the account out everywhere (in case someone else had access).
      revokeSessionsOnPasswordReset: true,
      // Using the reset link proves the user controls the inbox, so the email counts as verified.
      onPasswordReset: async ({ user }) => {
         if (!user.emailVerified) {
            await db.user.update({ where: { id: user.id }, data: { emailVerified: true } });
         }
      }
   },
   emailVerification: {
      sendOnSignUp: true,
      // Signing in with an unverified email sends a fresh link (e.g. when the first one expired).
      sendOnSignIn: true,
      // Clicking the link signs the user in, so they land straight in the app.
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60, // seconds
      sendVerificationEmail: async ({ user, url }) => {
         await sendEmail({
            to: user.email,
            subject: 'Confirm your email',
            react: createElement(VerifyEmail, { name: user.name, url })
         });
      }
   },
   advanced: {
      // Send emails after the response instead of making the request wait for SMTP. Waiting would
      // also make "email exists" responses measurably slower, leaking which accounts exist.
      // after() keeps the function alive until the email is sent, even on serverless hosts.
      backgroundTasks: { handler: (promise) => after(promise) }
   },
   plugins: [
      // Workspaces (tenants): organizations, their members + roles, invitations.
      // The user who creates an organization becomes its "owner".
      organization(),
      // nextCookies lets server actions set the session cookie. It must stay last in the list.
      nextCookies()
   ]
});
