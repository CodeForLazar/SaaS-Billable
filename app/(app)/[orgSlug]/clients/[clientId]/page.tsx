import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FolderKanban, Pencil, Plus } from 'lucide-react';
import { ArchiveButton } from '@/components/archive-button';
import { ColorDot } from '@/components/color-dot';
import { Detail, DetailList } from '@/components/detail-list';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { can } from '@/lib/permissions';
import { getTimeZone } from '@/lib/time-zone';
import { cn } from '@/lib/utils';
import { getClient } from '@/server/clients';
import { listClientProjects } from '@/server/projects';
import { setClientArchivedAction } from '../actions';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/clients/[clientId]'>): Promise<Metadata> {
   const { orgSlug, clientId } = await params;
   const { organization, client } = await getClient(orgSlug, clientId);
   return { title: `${client.name} · ${organization.name}` };
}

export default async function ClientPage({ params }: PageProps<'/[orgSlug]/clients/[clientId]'>) {
   const { orgSlug, clientId } = await params;
   // 404 (inside the app shell, [orgSlug]/not-found.tsx) if the client doesn't exist or belongs
   // to another workspace.
   const { organization, role, client } = await getClient(orgSlug, clientId);
   const projects = await listClientProjects(orgSlug, client.id);
   const timeZone = await getTimeZone(); // dates on the user's calendar, not the server's
   const activeProjects = projects.filter((project) => !project.archivedAt).length;

   const clientsPath = `/${organization.slug}/clients`;
   const projectsPath = `/${organization.slug}/projects`;
   const archived = !!client.archivedAt;
   const canAddProject = !archived && can(role, { project: ['create'] });

   return (
      <div className='flex w-full max-w-3xl flex-1 flex-col gap-6 p-6'>
         <Link
            href={archived ? `${clientsPath}?status=archived` : clientsPath}
            className='flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
         >
            <ArrowLeft className='size-4' aria-hidden='true' />
            {archived ? 'Archived clients' : 'All clients'}
         </Link>

         <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='min-w-0'>
               <div className='flex items-center gap-2'>
                  <h1 className='text-2xl font-semibold break-words'>{client.name}</h1>
                  {archived && <Badge variant='secondary'>Archived</Badge>}
               </div>
               {client.company && <p className='text-muted-foreground'>{client.company}</p>}
            </div>
            <div className='flex gap-2'>
               {can(role, { client: ['update'] }) && (
                  <Link
                     href={`${clientsPath}/${client.id}/edit`}
                     className={cn(buttonVariants({ variant: 'outline' }))}
                  >
                     <Pencil aria-hidden='true' />
                     Edit
                  </Link>
               )}
               {can(role, { client: ['archive'] }) && (
                  <ArchiveButton
                     action={setClientArchivedAction.bind(null, organization.slug, client.id)}
                     name={client.name}
                     archived={archived}
                     description={`The client is hidden from your lists${
                        activeProjects > 0
                           ? `, and its ${activeProjects} active ${activeProjects === 1 ? 'project is' : 'projects are'} archived too`
                           : ''
                     }. Nothing is deleted: restoring the client brings them back.`}
                  />
               )}
            </div>
         </div>

         <DetailList>
            <Detail label='Email'>
               {client.email ? (
                  <a
                     href={`mailto:${client.email}`}
                     className='break-all underline-offset-4 hover:underline'
                  >
                     {client.email}
                  </a>
               ) : (
                  '—'
               )}
            </Detail>
            {/* whitespace-pre-line keeps the line breaks typed into the field */}
            <Detail label='Billing address' className='whitespace-pre-line'>
               {client.address ?? '—'}
            </Detail>
            <Detail label='Notes' className='break-words whitespace-pre-line'>
               {client.notes ?? '—'}
            </Detail>
            <Detail label='Added'>{formatDate(client.createdAt, timeZone)}</Detail>
            {client.archivedAt && (
               <Detail label='Archived'>{formatDate(client.archivedAt, timeZone)}</Detail>
            )}
         </DetailList>

         <section aria-labelledby='projects-heading' className='flex flex-col gap-4'>
            <div className='flex items-center justify-between gap-4'>
               <h2 id='projects-heading' className='text-lg font-semibold'>
                  Projects
               </h2>
               {canAddProject && (
                  <Link
                     href={`${projectsPath}/new?clientId=${client.id}`}
                     className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                     <Plus aria-hidden='true' />
                     New project
                  </Link>
               )}
            </div>

            {projects.length === 0 ? (
               <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center'>
                  <FolderKanban className='size-6 text-muted-foreground' aria-hidden='true' />
                  <p className='text-sm text-muted-foreground'>No projects for this client yet.</p>
               </div>
            ) : (
               <Table>
                  <TableHeader>
                     <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead className='text-right'>Hourly rate</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {projects.map((project) => (
                        <TableRow key={project.id}>
                           <TableCell>
                              <div className='flex items-center gap-2'>
                                 <ColorDot color={project.color} />
                                 <Link
                                    href={`${projectsPath}/${project.id}`}
                                    className='font-medium underline-offset-4 hover:underline'
                                 >
                                    {project.name}
                                 </Link>
                                 {project.archivedAt && <Badge variant='secondary'>Archived</Badge>}
                              </div>
                           </TableCell>
                           <TableCell className='text-right tabular-nums'>
                              {project.hourlyRateCents === null
                                 ? '—'
                                 : formatMoney(project.hourlyRateCents)}
                           </TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
            )}
         </section>
      </div>
   );
}
