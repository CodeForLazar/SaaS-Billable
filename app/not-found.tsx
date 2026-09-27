import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Page not found' };

// Shown for URLs that match no page, and whenever code calls notFound(), including
// requireMembership() for a workspace you're not a member of. The wording is deliberately the same
// for both: it mustn't reveal whether a workspace exists.
export default function NotFound() {
   return (
      <main className='flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center'>
         <p className='text-5xl font-semibold text-muted-foreground'>404</p>
         <div className='flex max-w-md flex-col gap-1'>
            <h1 className='text-xl font-semibold'>Page not found</h1>
            <p className='text-sm text-muted-foreground'>
               This page doesn&apos;t exist, or you don&apos;t have access to it.
            </p>
         </div>
         <div className='flex gap-2'>
            <Link href='/dashboard' className={cn(buttonVariants())}>
               Go to your workspace
            </Link>
            <Link href='/' className={cn(buttonVariants({ variant: 'outline' }))}>
               Home
            </Link>
         </div>
      </main>
   );
}
