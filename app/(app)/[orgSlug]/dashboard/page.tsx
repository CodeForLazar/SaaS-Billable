import type { Metadata } from 'next';
import Link from 'next/link';
import { signOut } from '@/app/(auth)/actions';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { listMemberships, requireMembership } from '@/server/organizations';

// params is a Promise in Next.js 16. requireMembership is cached, so calling it here and in
// the page costs one database lookup.
export async function generateMetadata({ params }: PageProps<'/[orgSlug]/dashboard'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Dashboard · ${organization.name}` };
}

// Placeholder content: the real dashboard (stats, charts) comes in Phase 7, the app shell in Phase 2.
export default async function DashboardPage({ params }: PageProps<'/[orgSlug]/dashboard'>) {
   const { orgSlug } = await params;
   const { session, organization, role } = await requireMembership(orgSlug);
   const memberships = await listMemberships(session.user.id);

   return (
      <main className='mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-6 px-4 py-16'>
         <div>
            <p className='text-sm text-muted-foreground'>{organization.name}</p>
            <h1 className='text-2xl font-semibold'>Hi, {session.user.name} 👋</h1>
         </div>
         <p className='text-muted-foreground'>
            You&apos;re signed in as <strong className='text-foreground'>{session.user.email}</strong> and you&apos;re{' '}
            <strong className='text-foreground'>{role}</strong> of this workspace.
         </p>

         <section className='flex flex-col gap-2'>
            <h2 className='font-medium'>Your workspaces</h2>
            <ul className='list-inside list-disc text-muted-foreground'>
               {memberships.map(({ organization: org }) => (
                  <li key={org.id}>
                     {org.slug === organization.slug ? (
                        <span className='font-medium text-foreground'>{org.name} (current)</span>
                     ) : (
                        <Link href={`/${org.slug}/dashboard`} className='text-foreground underline underline-offset-4'>
                           {org.name}
                        </Link>
                     )}
                  </li>
               ))}
            </ul>
         </section>

         <div className='flex gap-2'>
            <Link href='/create-workspace' className={cn(buttonVariants({ variant: 'outline' }))}>
               Create another workspace
            </Link>
            <form action={signOut}>
               <Button type='submit' variant='ghost'>
                  Sign out
               </Button>
            </form>
         </div>
      </main>
   );
}
