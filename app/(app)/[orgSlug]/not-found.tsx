'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// 404 *inside* the app shell, for notFound() in a workspace page (e.g. a client that doesn't exist
// or belongs to another workspace). The sidebar stays usable. When the workspace itself isn't
// accessible, requireMembership() fails in the layout, and the root app/not-found.tsx is shown.
export default function WorkspaceNotFound() {
   const { orgSlug } = useParams<{ orgSlug: string }>();

   return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center'>
         <p className='text-5xl font-semibold text-muted-foreground'>404</p>
         <div className='flex max-w-md flex-col gap-1'>
            <h1 className='text-xl font-semibold'>Not found</h1>
            <p className='text-sm text-muted-foreground'>
               This page doesn&apos;t exist, or you don&apos;t have access to it.
            </p>
         </div>
         <Link href={`/${orgSlug}/dashboard`} className={cn(buttonVariants())}>
            Go to dashboard
         </Link>
      </div>
   );
}
