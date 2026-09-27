import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';

// The server has no idea where the user is (on Vercel it runs in UTC). The browser does:
// <TimeZoneSync> (components/time-zone-sync.tsx) stores its time zone in this cookie, and the
// server uses it to show times and to work out "today" or "this week" for that user.
// The database always stores UTC.
export const TIME_ZONE_COOKIE = 'tz';

export function isValidTimeZone(timeZone: string) {
   try {
      new Intl.DateTimeFormat('en', { timeZone });
      return true;
   } catch {
      return false;
   }
}

/** The user's IANA time zone ("Europe/Skopje"), or UTC until the browser has reported it. */
export async function getTimeZone() {
   const value = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
   return value && isValidTimeZone(value) ? value : 'UTC';
}

/**
 * "Now" for this request, in milliseconds: the same value for the layout and the page (cache()
 * keeps one per request), so e.g. the header timer and the page's timer start from the same second.
 */
export const requestNow = cache(() => Date.now());
