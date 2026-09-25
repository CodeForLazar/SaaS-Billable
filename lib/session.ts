import { headers } from 'next/headers';
import { cache } from 'react';
import { auth } from '@/lib/auth';

// The current user's session, or null. This is our `req.user`.
// cache() makes repeated calls during the same request hit the database only once.
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));
