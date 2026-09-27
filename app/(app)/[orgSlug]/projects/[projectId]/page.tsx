import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { ArchiveButton } from '@/components/archive-button';
import { ColorDot } from '@/components/color-dot';
import { Detail, DetailList } from '@/components/detail-list';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { can } from '@/lib/permissions';
import { getTimeZone } from '@/lib/time-zone';
import { cn } from '@/lib/utils';
import { getProject } from '@/server/projects';
import { setProjectArchivedAction } from '../actions';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/projects/[projectId]'>): Promise<Metadata> {
   const { orgSlug, projectId } = await params;
   const { organization, project } = await getProject(orgSlug, projectId);
   return { title: `${project.name} · ${organization.name}` };
}

export default async function ProjectPage({
   params
}: PageProps<'/[orgSlug]/projects/[projectId]'>) {
   const { orgSlug, projectId } = await params;
   // 404 inside the app shell if the project doesn't exist or belongs to another workspace.
   const { organization, role, project } = await getProject(orgSlug, projectId);
   const projectsPath = `/${organization.slug}/projects`;
   const timeZone = await getTimeZone(); // dates on the user's calendar, not the server's
   const archived = !!project.archivedAt;

   return (
      <div className='flex w-full max-w-3xl flex-1 flex-col gap-6 p-6'>
         <Link
            href={archived ? `${projectsPath}?status=archived` : projectsPath}
            className='flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
         >
            <ArrowLeft className='size-4' aria-hidden='true' />
            {archived ? 'Archived projects' : 'All projects'}
         </Link>

         <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='min-w-0'>
               <div className='flex items-center gap-2'>
                  <ColorDot color={project.color} className='size-3' />
                  <h1 className='text-2xl font-semibold break-words'>{project.name}</h1>
                  {archived && <Badge variant='secondary'>Archived</Badge>}
               </div>
               <Link
                  href={`/${organization.slug}/clients/${project.client.id}`}
                  className='text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
               >
                  {project.client.name}
               </Link>
            </div>
            <div className='flex gap-2'>
               {can(role, { project: ['update'] }) && (
                  <Link
                     href={`${projectsPath}/${project.id}/edit`}
                     className={cn(buttonVariants({ variant: 'outline' }))}
                  >
                     <Pencil aria-hidden='true' />
                     Edit
                  </Link>
               )}
               {can(role, { project: ['archive'] }) && (
                  <ArchiveButton
                     action={setProjectArchivedAction.bind(null, organization.slug, project.id)}
                     name={project.name}
                     archived={archived}
                     description='The project is hidden from your lists and can no longer get new time. Nothing is deleted: you can restore it at any time.'
                  />
               )}
            </div>
         </div>

         <DetailList>
            <Detail label='Client'>
               {project.client.name}
               {project.client.archivedAt && (
                  <span className='text-muted-foreground'> (archived)</span>
               )}
            </Detail>
            <Detail label='Hourly rate'>
               {project.hourlyRateCents === null
                  ? 'Not set'
                  : `${formatMoney(project.hourlyRateCents)} per hour`}
            </Detail>
            <Detail label='Added'>{formatDate(project.createdAt, timeZone)}</Detail>
            {project.archivedAt && (
               <Detail label='Archived'>{formatDate(project.archivedAt, timeZone)}</Detail>
            )}
         </DetailList>
      </div>
   );
}
