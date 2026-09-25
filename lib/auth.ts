import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/lib/db';

// BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment automatically.
export const auth = betterAuth({
   database: prismaAdapter(db, { provider: 'postgresql' }),
   emailAndPassword: {
      enabled: true
   },
   // nextCookies lets server actions set the session cookie. It must stay last in the list.
   plugins: [nextCookies()]
});
