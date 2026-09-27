'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { auth } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { TIME_ZONE_COOKIE, isValidTimeZone } from '@/lib/time-zone';
import { cleanUpSandboxes, getOwnSandboxSlug, startDemo } from '@/server/demo';

export type DemoState = { error?: string } | undefined;

/**
 * "Try the demo": a fresh sandbox for this visitor, signed in, laid out on their clock.
 * The time zone comes from the browser (the button adds it); junk falls back to UTC.
 */
export async function startDemoAction(_prev: DemoState, formData: FormData): Promise<DemoState> {
   const zone = formData.get('timeZone');
   const timeZone = typeof zone === 'string' && isValidTimeZone(zone) ? zone : 'UTC';

   // Already in a demo? Back to it rather than creating another one.
   const session = await getSession();
   const existing = session && (await getOwnSandboxSlug(session.user.email));
   if (existing) redirect(`/${existing}/dashboard`);

   let slug: string;
   try {
      slug = await startDemo(timeZone);
   } catch (error) {
      console.error('Starting a demo failed', error);
      return { error: 'The demo could not be started. Please try again in a moment.' };
   }
   // The same cookie <TimeZoneSync> sets, so the first page already uses the visitor's clock.
   (await cookies()).set(TIME_ZONE_COOKIE, timeZone, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax'
   });
   // Old sandboxes are removed after the response is sent: the visitor doesn't wait for it.
   after(cleanUpSandboxes);
   redirect(`/${slug}/dashboard`);
}

/** "Create your own account" from inside the demo: leave the demo, then sign up. */
export async function leaveDemoAction() {
   await auth.api.signOut({ headers: await headers() });
   redirect('/sign-up');
}
