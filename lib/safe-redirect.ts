// "Where to go after signing in" arrives in the URL (?redirectTo=...), so anyone can craft it.
// Only paths on our own site are allowed. Otherwise a real sign-in link like
// /sign-in?redirectTo=https://evil.example would send users to another site after they sign in
// (an "open redirect", a classic phishing trick).

const BASE = 'http://internal.invalid'; // only used to parse; never visited

/** Returns the path if it stays on this site ("/acme/dashboard?x=1"), otherwise null. */
export function safeRedirectPath(value: unknown): string | null {
   if (typeof value !== 'string' || !value.startsWith('/')) return null;
   try {
      // The URL parser normalizes tricks like "//evil.com", "/\evil.com" or tabs/newlines, and
      // resolves them the way a browser would. If the result leaves our base, reject it.
      const url = new URL(value, BASE);
      if (url.origin !== BASE) return null;
      return url.pathname + url.search + url.hash;
   } catch {
      return null;
   }
}

/** Link to an auth page that keeps "where to go next" (and a pre-filled email) across pages. */
export function authHref(path: '/sign-in' | '/sign-up', params: { redirectTo?: string | null; email?: string | null }) {
   const query = new URLSearchParams();
   if (params.redirectTo) query.set('redirectTo', params.redirectTo);
   if (params.email) query.set('email', params.email);
   const qs = query.toString();
   return qs ? `${path}?${qs}` : path;
}
