import type { Instrumentation } from 'next';

// Next.js calls this for every error on the server: page rendering, Server Actions, route handlers
// and the proxy (like an Express error-handling middleware). It writes one JSON line per error, which
// is readable locally and searchable in hosting logs (Vercel etc.). The `digest` is the same id the
// error page shows as "Reference", so a user's report can be matched to the exact log line.
// A service like Sentry could be called from here later.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
   const err = error instanceof Error ? error : new Error(String(error));
   const digest =
      typeof error === 'object' && error !== null && 'digest' in error
         ? String(error.digest)
         : undefined;

   console.error(
      JSON.stringify({
         level: 'error',
         time: new Date().toISOString(),
         digest,
         message: err.message,
         stack: err.stack,
         method: request.method,
         // Without the query string: some URLs carry secrets (e.g. /reset-password?token=...).
         path: request.path.split('?')[0],
         route: context.routePath,
         type: context.routeType // 'render' | 'action' | 'route' | 'proxy'
      })
   );
};
