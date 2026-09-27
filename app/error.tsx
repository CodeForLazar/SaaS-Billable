'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { ErrorState } from '@/components/error-state';

// Catches unexpected errors in any page below the root layout (auth pages, onboarding, ...).
// Workspace pages have their own boundary inside the app shell: app/(app)/[orgSlug]/error.tsx.
export default function Error({
   error,
   retry
}: {
   error: Error & { digest?: string };
   retry: () => void;
}) {
   // Server errors are already logged by instrumentation.ts; this catches browser-side ones too.
   useEffect(() => console.error(error), [error]);

   return (
      <main className='flex flex-1'>
         <ErrorState digest={error.digest} retry={retry} homeHref='/' homeLabel='Home' />
      </main>
   );
}
