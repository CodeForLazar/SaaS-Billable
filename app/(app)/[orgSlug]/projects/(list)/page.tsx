import type { Metadata } from 'next';
import Link from 'next/link';
import { FolderKanban, Plus } from 'lucide-react';
import { ColorDot } from '@/components/color-dot';
import { ListPagination, ListSearch, StatusTabs } from '@/components/list-controls';
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
import { formatMoney } from '@/utils/money';
import { can } from '@/lib/permissions';
import { getTimeZone } from '@/lib/time-zone';
import { cn } from '@/lib/utils';
import { listHref, listQuerySchema } from '@/validations/list';
import { requireMembership } from '@/server/organizations';
import { listProjects } from '@/server/projects';
import { getWorkspaceSettings } from '@/server/settings';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/projects'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Projects · ${organization.name}` };
}

// Same pattern as the clients list: search, status and page live in the URL.
export default async function ProjectsPage({
   params,
   searchParams
}: PageProps<'/[orgSlug]/projects'>) {
   const { orgSlug } = await params;
   const query = listQuerySchema.parse(await searchParams);
   const { organization, role, projects, total, page, pageCount, pageSize } = await listProjects(
      orgSlug,
      query
   );
   const basePath = `/${organization.slug}/projects`;
   const timeZone = await getTimeZone(); // dates on the user's calendar, not the server's
   const { currency } = await getWorkspaceSettings(orgSlug);
   const clientsPath = `/${organization.slug}/clients`;
   const canCreate = can(role, { project: ['create'] });
   const archived = query.status === 'archived';
   const newProjectLink = (
      <Link href={`${basePath}/new`} className={cn(buttonVariants())}>
         <Plus aria-hidden='true' />
         New project
      </Link>
   );

   return (
      <div className='flex w-full max-w-5xl flex-1 flex-col gap-6 p-6'>
         <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
               <h1 className='text-2xl font-semibold'>Projects</h1>
               <p className='text-muted-foreground'>The work you track time on and bill for.</p>
            </div>
            {canCreate && newProjectLink}
         </div>

         <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <ListSearch
               basePath={basePath}
               query={query}
               placeholder='Search by project or client'
               label='Search projects'
            />
            <StatusTabs basePath={basePath} query={query} />
         </div>

         {projects.length === 0 ? (
            <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center'>
               <FolderKanban className='size-8 text-muted-foreground' aria-hidden='true' />
               {query.q ? (
                  <>
                     <p className='font-medium'>
                        No {archived && 'archived '}projects match &ldquo;{query.q}&rdquo;
                     </p>
                     <Link
                        href={archived ? `${basePath}?status=archived` : basePath}
                        className='text-sm underline underline-offset-4'
                     >
                        Clear search
                     </Link>
                  </>
               ) : archived ? (
                  <>
                     <p className='font-medium'>No archived projects</p>
                     <p className='text-sm text-muted-foreground'>
                        Finished projects you archive are kept here with their time and invoices.
                     </p>
                  </>
               ) : (
                  <>
                     <p className='font-medium'>No projects yet</p>
                     <p className='text-sm text-muted-foreground'>
                        Projects belong to a client and hold the time you track.
                     </p>
                     {canCreate && <div className='mt-2'>{newProjectLink}</div>}
                  </>
               )}
            </div>
         ) : (
            <>
               <Table>
                  <TableHeader>
                     <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead className='hidden sm:table-cell'>Client</TableHead>
                        <TableHead className='text-right'>Hourly rate</TableHead>
                        <TableHead className='hidden text-right sm:table-cell'>
                           {archived ? 'Archived' : 'Added'}
                        </TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {projects.map((project) => (
                        <TableRow key={project.id}>
                           <TableCell>
                              <div className='flex items-center gap-2'>
                                 <ColorDot color={project.color} />
                                 <Link
                                    href={`${basePath}/${project.id}`}
                                    className='font-medium underline-offset-4 hover:underline'
                                 >
                                    {project.name}
                                 </Link>
                              </div>
                              <div className='pl-4.5 text-xs text-muted-foreground sm:hidden'>
                                 {project.client.name}
                              </div>
                           </TableCell>
                           <TableCell className='hidden sm:table-cell'>
                              <Link
                                 href={`${clientsPath}/${project.client.id}`}
                                 className='text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'
                              >
                                 {project.client.name}
                              </Link>
                           </TableCell>
                           <TableCell className='text-right tabular-nums'>
                              {project.hourlyRateCents === null
                                 ? '—'
                                 : formatMoney(project.hourlyRateCents, currency)}
                           </TableCell>
                           <TableCell className='hidden text-right text-muted-foreground sm:table-cell'>
                              {formatDate(project.archivedAt ?? project.createdAt, timeZone)}
                           </TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>

               <ListPagination
                  pageHref={(target) => listHref(basePath, query, { page: target })}
                  page={page}
                  pageCount={pageCount}
                  pageSize={pageSize}
                  total={total}
                  noun={['project', 'projects']}
               />
            </>
         )}
      </div>
   );
}
