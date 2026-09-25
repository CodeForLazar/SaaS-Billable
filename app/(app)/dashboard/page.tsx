import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/session';

export const metadata: Metadata = { title: 'Dashboard' };

// Temporary landing page after sign-in. Replaced by /[orgSlug]/dashboard in Phase 1.5.
export default async function DashboardPage() {
   const session = await getSession();
   if (!session) redirect('/sign-in');

   return (
      <main className='mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-6 px-4 py-16'>
         <h1 className='text-2xl font-semibold'>Hi, {session.user.name} 👋</h1>
         <p className='text-muted-foreground'>
            You&apos;re signed in as <strong className='text-foreground'>{session.user.email}</strong>.
         </p>
         {/* A plain form posting to a Server Action: works even before any JavaScript loads. */}
         <form action={signOut}>
            <Button type='submit' variant='outline'>
               Sign out
            </Button>
         </form>
      </main>
   );
}
