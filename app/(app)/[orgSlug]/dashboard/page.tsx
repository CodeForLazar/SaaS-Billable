import type { Metadata } from 'next';
import Link from 'next/link';
import { signOut } from '@/app/(auth)/actions';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { Button } from '@/components/ui/button';
import { listMemberships, requireMembership } from '@/server/organizations';

// params is a Promise in Next.js 16. requireMembership is cached, so calling it here and in
// the page costs one database lookup.
export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/dashboard'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Dashboard · ${organization.name}` };
}

// Placeholder content: the real dashboard (stats, charts) comes in Phase 7, the app shell in Phase 2
// (the switcher and sign-out then move into the header).
export default async function DashboardPage({ params }: PageProps<'/[orgSlug]/dashboard'>) {
   const { orgSlug } = await params;
   const { session, organization, role } = await requireMembership(orgSlug);
   const memberships = await listMemberships(session.user.id);

   return (
      <main className='mx-auto flex w-full max-w-2xl flex-1 flex-col items-start gap-6 px-4 py-16'>
         <div className='flex w-full items-center justify-between gap-4'>
            <WorkspaceSwitcher
               current={organization}
               workspaces={memberships.map((m) => m.organization)}
            />
            <form action={signOut}>
               <Button type='submit' variant='ghost'>
                  Sign out
               </Button>
            </form>
         </div>

         <div>
            <p className='text-sm text-muted-foreground'>{organization.name}</p>
            <h1 className='text-2xl font-semibold'>Hi, {session.user.name} 👋</h1>
         </div>
         <p className='text-muted-foreground'>
            You&apos;re signed in as{' '}
            <strong className='text-foreground'>{session.user.email}</strong> and you&apos;re{' '}
            <strong className='text-foreground'>{role}</strong> of this workspace.
         </p>
         {/* Temporary navigation until the sidebar exists (Phase 2) */}
         <Link
            href={`/${organization.slug}/settings/members`}
            className='text-sm underline underline-offset-4'
         >
            Members
         </Link>
      </main>
   );
}
