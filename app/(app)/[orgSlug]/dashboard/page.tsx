import type { Metadata } from 'next';
import { requireMembership } from '@/server/organizations';

// params is a Promise in Next.js 16. requireMembership is cached, so calling it here and in
// the page costs one database lookup.
export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/dashboard'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Dashboard · ${organization.name}` };
}

// Placeholder content: the real dashboard (stats, charts) comes in Phase 7.
// The layout's SidebarInset is the page's <main>, so pages use a plain <div>.
export default async function DashboardPage({ params }: PageProps<'/[orgSlug]/dashboard'>) {
   const { orgSlug } = await params;
   const { session, organization, role } = await requireMembership(orgSlug);

   return (
      <div className='flex flex-1 flex-col gap-2 p-6'>
         <h1 className='text-2xl font-semibold'>Hi, {session.user.name} 👋</h1>
         <p className='text-muted-foreground'>
            Welcome to <strong className='text-foreground'>{organization.name}</strong>. You&apos;re{' '}
            {role === 'admin' || role === 'owner' ? 'an' : 'a'}{' '}
            <strong className='text-foreground'>{role}</strong> of this workspace.
         </p>
      </div>
   );
}
