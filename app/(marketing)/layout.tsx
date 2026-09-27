import Link from 'next/link';
import { Timer } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { site } from '@/lib/site';
import { getSession } from '@/lib/session';
import { cn } from '@/lib/utils';

// Public pages (the landing page now, maybe pricing/about later). "(marketing)" is a route group:
// it gives these pages their own header and footer without changing the URL (the page is at "/").
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
   // Signed-in visitors get a shortcut into the app instead of "Sign in / Get started".
   const session = await getSession();

   return (
      <div className='flex min-h-full flex-1 flex-col'>
         <header className='border-b'>
            <div className='mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4'>
               <Link href='/' className='flex items-center gap-2 font-semibold'>
                  <span className='flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground'>
                     <Timer className='size-4' aria-hidden='true' />
                  </span>
                  {site.name}
               </Link>
               <nav className='flex items-center gap-2'>
                  {session ? (
                     <Link href='/dashboard' className={cn(buttonVariants())}>
                        Go to dashboard
                     </Link>
                  ) : (
                     <>
                        <Link href='/sign-in' className={cn(buttonVariants({ variant: 'ghost' }))}>
                           Sign in
                        </Link>
                        <Link href='/sign-up' className={cn(buttonVariants())}>
                           Get started
                        </Link>
                     </>
                  )}
               </nav>
            </div>
         </header>

         <main className='flex-1'>{children}</main>

         <footer className='border-t'>
            <div className='mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between'>
               <p>
                  © {new Date().getFullYear()} {site.name}
               </p>
               <p>Built with Next.js, Prisma, PostgreSQL and Better Auth</p>
            </div>
         </footer>
      </div>
   );
}
