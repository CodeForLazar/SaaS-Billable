'use client';

import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
   /** error.digest from Next.js: the same id appears in the server log (instrumentation.ts). */
   digest?: string;
   retry: () => void;
   homeHref?: string;
   homeLabel?: string;
};

// Shared by app/error.tsx and the workspace error boundary. In production Next.js replaces the
// real message of server errors with a generic one, so we never show error.message; the reference
// id lets someone report the problem and us find the matching log line.
export function ErrorState({ digest, retry, homeHref, homeLabel = 'Go back' }: Props) {
   return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center'>
         <TriangleAlert className='size-10 text-muted-foreground' aria-hidden='true' />
         <div className='flex max-w-md flex-col gap-1'>
            <h1 className='text-xl font-semibold'>Something went wrong</h1>
            <p className='text-sm text-muted-foreground'>
               An unexpected error occurred. Please try again. If it keeps happening, contact
               support and include the reference below.
            </p>
         </div>
         {digest && (
            <p className='text-xs text-muted-foreground'>
               Reference: <code className='rounded bg-muted px-1.5 py-0.5'>{digest}</code>
            </p>
         )}
         <div className='flex gap-2'>
            {/* retry() re-fetches the failed part from the server and renders it again */}
            <Button onClick={() => retry()}>Try again</Button>
            {homeHref && (
               <Link href={homeHref} className={cn(buttonVariants({ variant: 'outline' }))}>
                  {homeLabel}
               </Link>
            )}
         </div>
      </div>
   );
}
