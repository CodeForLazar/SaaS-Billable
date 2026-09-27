'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ErrorState } from '@/components/error-state';

// Errors in a workspace page show up *inside* the app shell: this boundary sits below the
// workspace layout, so the sidebar and header keep working and the user can navigate away.
// (Errors in the layout itself bubble up to app/error.tsx.)
export default function WorkspaceError({
   error,
   retry
}: {
   error: Error & { digest?: string };
   retry: () => void;
}) {
   const { orgSlug } = useParams<{ orgSlug: string }>();
   useEffect(() => console.error(error), [error]);

   return (
      <ErrorState
         digest={error.digest}
         retry={retry}
         homeHref={`/${orgSlug}/dashboard`}
         homeLabel='Go to dashboard'
      />
   );
}
