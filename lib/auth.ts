import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { after } from 'next/server';
import { createElement } from 'react';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/mailer';
import VerifyEmail from '@/emails/verify-email';

// BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment automatically.
export const auth = betterAuth({
   database: prismaAdapter(db, { provider: 'postgresql' }),
   emailAndPassword: {
      enabled: true,
      // No session until the email is confirmed. Sign-in with an unverified email is rejected.
      requireEmailVerification: true
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
   // nextCookies lets server actions set the session cookie. It must stay last in the list.
   plugins: [nextCookies()]
});
