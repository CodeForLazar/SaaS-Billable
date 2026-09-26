import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/(auth)/actions';
import { Button, buttonVariants } from '@/components/ui/button';
import { auth } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Dashboard' };

// Temporary landing page after sign-in. Replaced by /[orgSlug]/dashboard in Phase 1.5 step 3.
export default async function DashboardPage() {
   const session = await getSession();
   if (!session) redirect('/sign-in');

   // The organizations the signed-in user is a member of.
   const organizations = await auth.api.listOrganizations({ headers: await headers() });
   if (organizations.length === 0) redirect('/create-workspace');

   return (
      <main className='mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-6 px-4 py-16'>
         <h1 className='text-2xl font-semibold'>Hi, {session.user.name} 👋</h1>
         <p className='text-muted-foreground'>
            You&apos;re signed in as <strong className='text-foreground'>{session.user.email}</strong>.
         </p>

         <section className='flex flex-col gap-2'>
            <h2 className='font-medium'>Your workspaces</h2>
            <ul className='list-inside list-disc text-muted-foreground'>
               {organizations.map((org) => (
                  <li key={org.id}>
                     <span className='text-foreground'>{org.name}</span> · /{org.slug}
                  </li>
               ))}
            </ul>
         </section>

         <div className='flex gap-2'>
            {/* A link styled as a button. cn() resolves the conflicting base/variant classes, like <Button> does. */}
            <Link href='/create-workspace' className={cn(buttonVariants({ variant: 'outline' }))}>
               Create another workspace
            </Link>
            {/* A plain form posting to a Server Action: works even before any JavaScript loads. */}
            <form action={signOut}>
               <Button type='submit' variant='ghost'>
                  Sign out
               </Button>
            </form>
         </div>
      </main>
   );
}
