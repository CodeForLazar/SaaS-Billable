import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { centsToInput } from '@/lib/money';
import { can } from '@/lib/permissions';
import { DEFAULT_PROJECT_COLOR } from '@/lib/project-colors';
import { listClientOptions } from '@/server/clients';
import { getProject } from '@/server/projects';
import { updateProjectAction } from '../../actions';
import { ProjectForm } from '../../project-form';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/projects/[projectId]/edit'>): Promise<Metadata> {
   const { orgSlug, projectId } = await params;
   const { organization, project } = await getProject(orgSlug, projectId);
   return { title: `Edit ${project.name} · ${organization.name}` };
}

export default async function EditProjectPage({
   params
}: PageProps<'/[orgSlug]/projects/[projectId]/edit'>) {
   const { orgSlug, projectId } = await params;
   const { organization, role, project } = await getProject(orgSlug, projectId);
   if (!can(role, { project: ['update'] })) notFound();

   // Active clients, plus the current one even if it's archived, so the field isn't empty.
   const clients = await listClientOptions(orgSlug, project.clientId);

   return (
      <div className='flex w-full max-w-2xl flex-1 flex-col gap-6 p-6'>
         <div>
            <h1 className='text-2xl font-semibold'>Edit project</h1>
            <p className='text-muted-foreground'>{project.name}</p>
         </div>
         <ProjectForm
            action={updateProjectAction.bind(null, organization.slug, project.id)}
            clients={clients.map((client) => ({
               value: client.id,
               label: client.archivedAt ? `${client.name} (archived)` : client.name
            }))}
            defaultValues={{
               name: project.name,
               clientId: project.clientId,
               hourlyRate: centsToInput(project.hourlyRateCents),
               color: project.color ?? DEFAULT_PROJECT_COLOR
            }}
            submitLabel='Save changes'
            cancelHref={`/${organization.slug}/projects/${project.id}`}
         />
      </div>
   );
}
