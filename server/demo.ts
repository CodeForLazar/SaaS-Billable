import 'server-only';
import { randomBytes } from 'node:crypto';
import { addHours } from 'date-fns';
import { headers } from 'next/headers';
import { cache } from 'react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { demoEmails, seedDemoWorkspace } from '@/lib/demo-seed';

// "Try the demo": every visitor gets a fresh sandbox (their own user + a workspace full of demo
// data) instead of a shared demo account, so visitors can do anything, even delete things,
// without seeing each other's changes. Sandboxes are deleted after DEMO_LIFETIME_HOURS.
// Demo workspaces never send email (a visitor could otherwise email any real address).

export const DEMO_LIFETIME_HOURS = 24;
/** At most this many sandboxes at once; the oldest go first. Keeps the database small. */
const MAX_SANDBOXES = 200;
/** Deleted per cleanup run, so one visitor never waits for a big cleanup. */
const CLEANUP_BATCH = 20;

/**
 * Creates a sandbox and signs the visitor into it (sets the session cookie; call from a Server
 * Action). Returns the workspace slug to redirect to.
 */
export async function startDemo(timeZone: string) {
   const suffix = randomBytes(5).toString('hex'); // 10 hex characters
   const key = `demo-${suffix}`;
   const slug = `demo-${suffix}`;
   // Random and never shown: the visitor is signed in right away and can't sign in again later
   // (the sandbox expires anyway).
   const password = randomBytes(24).toString('base64url');

   const { ownerEmail } = await seedDemoWorkspace(db, {
      key,
      slug,
      password,
      timeZone,
      expiresAt: addHours(new Date(), DEMO_LIFETIME_HOURS)
   });
   // A normal Better Auth sign-in: the session is created and nextCookies() sets the cookie.
   await auth.api.signInEmail({ body: { email: ownerEmail, password }, headers: await headers() });
   return slug;
}

/** The sandbox a workspace belongs to, or null for real workspaces. Cached per request. */
export const getDemoSandbox = cache(async (organizationId: string) =>
   db.demoSandbox.findUnique({
      where: { organizationId },
      select: { key: true, expiresAt: true }
   })
);

export async function isDemoWorkspace(organizationId: string) {
   return (await getDemoSandbox(organizationId)) !== null;
}

/**
 * The signed-in user's own sandbox, if they are a demo owner whose sandbox still exists: clicking
 * "Try the demo" again takes them back to it instead of creating another one.
 */
export async function getOwnSandboxSlug(email: string) {
   const sandbox = await db.demoSandbox.findFirst({
      where: { key: email.replace(/@example\.com$/, ''), expiresAt: { gt: new Date() } },
      select: { organization: { select: { slug: true } } }
   });
   return sandbox?.organization.slug ?? null;
}

/**
 * Deletes expired sandboxes, and the oldest ones beyond MAX_SANDBOXES, with their users.
 * Runs after a new demo starts (in after(), so nobody waits for it); no cron job needed.
 */
export async function cleanUpSandboxes() {
   const now = new Date();
   const [expired, overLimit] = await Promise.all([
      db.demoSandbox.findMany({
         where: { expiresAt: { lte: now } },
         orderBy: { expiresAt: 'asc' },
         take: CLEANUP_BATCH,
         select: { organizationId: true, key: true }
      }),
      db.demoSandbox.findMany({
         orderBy: { createdAt: 'desc' },
         skip: MAX_SANDBOXES,
         take: CLEANUP_BATCH,
         select: { organizationId: true, key: true }
      })
   ]);
   const sandboxes = [...new Map([...expired, ...overLimit].map((s) => [s.key, s])).values()];

   for (const sandbox of sandboxes) {
      const emails = demoEmails(sandbox.key);
      const users = await db.user.findMany({
         where: { email: { in: emails } },
         select: { id: true }
      });
      const userIds = users.map((user) => user.id);
      try {
         await deleteSandbox(sandbox.organizationId, userIds);
      } catch (error) {
         // Log and carry on with the others; the next run tries this one again.
         console.error('Deleting demo sandbox failed', { key: sandbox.key, error });
      }
   }
   return sandboxes.length;
}

async function deleteSandbox(organizationId: string, userIds: string[]) {
   await db.$transaction([
      // The sandbox workspace (everything in it cascades), plus any workspace the demo owner
      // created from inside the demo, but never one that has a real owner as well.
      db.organization.deleteMany({
         where: {
            OR: [
               { id: organizationId },
               {
                  members: {
                     some: { userId: { in: userIds }, role: 'owner' },
                     none: { role: 'owner', userId: { notIn: userIds } }
                  }
               }
            ]
         }
      }),
      // Then the demo users (their sessions and accounts cascade).
      db.user.deleteMany({ where: { id: { in: userIds } } })
   ]);
}
