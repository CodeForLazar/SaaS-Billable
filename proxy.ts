import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

// Runs before every matched request (Next 16's "proxy", formerly "middleware").
//
// This is only a fast first filter: it checks that a session cookie EXISTS, not that it's valid,
// and never touches the database. Visitors with no cookie at all are sent to /sign-in without
// rendering anything. The real checks stay in the pages and server/ (getSession, requireMembership):
// an expired or forged cookie gets past this proxy and is rejected there.

// Pages anyone may open. Everything else (workspaces, /dashboard, /create-workspace) needs a session.
const PUBLIC_PATHS = new Set([
   '/',
   '/sign-in',
   '/sign-up',
   '/check-email',
   '/forgot-password',
   '/reset-password'
]);

// Public pages with a variable part: the invitation page must open for people who aren't signed in yet.
// /i/<token>: the invoice page a client opens from the email (and its PDF), no account needed.
const PUBLIC_PREFIXES = ['/accept-invitation/', '/i/'];

export function proxy(request: NextRequest) {
   const { pathname } = request.nextUrl;
   if (
      PUBLIC_PATHS.has(pathname) ||
      PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
   ) {
      return NextResponse.next();
   }

   if (!getSessionCookie(request)) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
   }

   // Deliberately no "signed in -> leave /sign-in" redirect here: the cookie might be expired, and
   // the page would send the user straight back, looping. The auth pages do that check properly.
   return NextResponse.next();
}

export const config = {
   matcher: [
      // Everything except Better Auth's API, Next.js internals and files with an extension
      // (images, favicon, robots.txt, ...).
      '/((?!api/|_next/static|_next/image|.*\\..*).*)'
   ]
};
