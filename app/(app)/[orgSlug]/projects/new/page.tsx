import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { can } from '@/lib/permissions';
import { DEFAULT_PROJECT_COLOR } from '@/utils/project-colors';
import { cn } from '@/lib/utils';
import { listClientOptions } from '@/server/clients';
import { requireMembership } from '@/server/organizations';
import { getWorkspaceSettings } from '@/server/settings';
import { createProjectAction } from '../actions';
import { ProjectForm } from '../project-form';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/projects/new'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `New project · ${organization.name}` };
}

// ?clientId=... (from a client's page) preselects that client.
export default async function NewProjectPage({
   params,
   searchParams
}: PageProps<'/[orgSlug]/projects/new'>) {
   const { orgSlug } = await params;
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { project: ['create'] })) notFound();

   const clients = await listClientOptions(orgSlug);
   const { currency } = await getWorkspaceSettings(orgSlug);
   const { clientId } = await searchParams;
   // Only used as a starting value, and only if it's one of the options.
   const preselected = clients.find((client) => client.id === clientId)?.id ?? '';
   const projectsPath = `/${organization.slug}/projects`;

   return (
      <div className='flex w-full max-w-2xl flex-1 flex-col gap-6 p-6'>
         <div>
            <h1 className='text-2xl font-semibold'>New project</h1>
            <p className='text-muted-foreground'>Work for one of your clients.</p>
         </div>
         {clients.length === 0 ? (
            <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center'>
               <p className='font-medium'>Add a client first</p>
               <p className='text-sm text-muted-foreground'>Every project belongs to a client.</p>
               {can(role, { client: ['create'] }) && (
                  <Link
                     href={`/${organization.slug}/clients/new`}
                     className={cn(buttonVariants(), 'mt-2')}
                  >
                     New client
                  </Link>
               )}
            </div>
         ) : (
            <ProjectForm
               currency={currency}
               action={createProjectAction.bind(null, organization.slug)}
               clients={clients.map((client) => ({ value: client.id, label: client.name }))}
               defaultValues={{
                  name: '',
                  clientId: preselected,
                  hourlyRate: '',
                  color: DEFAULT_PROJECT_COLOR
               }}
               submitLabel='Add project'
               cancelHref={
                  preselected ? `/${organization.slug}/clients/${preselected}` : projectsPath
               }
            />
         )}
      </div>
   );
}
