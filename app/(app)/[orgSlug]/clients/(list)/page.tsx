import type { Metadata } from 'next';
import Link from 'next/link';
import { Contact, Plus } from 'lucide-react';
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
import { can } from '@/lib/permissions';
import { getTimeZone } from '@/lib/time-zone';
import { cn } from '@/lib/utils';
import { listQuerySchema } from '@/lib/validations/list';
import { listClients } from '@/server/clients';
import { requireMembership } from '@/server/organizations';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/clients'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Clients · ${organization.name}` };
}

// Search, status and page live in the URL (?q=acme&status=archived&page=2): the page is rendered
// on the server from them, so results can be bookmarked and shared, and the back button works.
export default async function ClientsPage({
   params,
   searchParams
}: PageProps<'/[orgSlug]/clients'>) {
   const { orgSlug } = await params;
   const query = listQuerySchema.parse(await searchParams);
   const { organization, role, clients, total, page, pageCount, pageSize } = await listClients(
      orgSlug,
      query
   );
   const basePath = `/${organization.slug}/clients`;
   const timeZone = await getTimeZone(); // dates on the user's calendar, not the server's
   const canCreate = can(role, { client: ['create'] });
   const archived = query.status === 'archived';
   const newClientLink = (
      <Link href={`${basePath}/new`} className={cn(buttonVariants())}>
         <Plus aria-hidden='true' />
         New client
      </Link>
   );

   return (
      <div className='flex w-full max-w-5xl flex-1 flex-col gap-6 p-6'>
         <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
               <h1 className='text-2xl font-semibold'>Clients</h1>
               <p className='text-muted-foreground'>The people and companies you work for.</p>
            </div>
            {canCreate && newClientLink}
         </div>

         <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <ListSearch
               basePath={basePath}
               query={query}
               placeholder='Search by name, company or email'
               label='Search clients'
            />
            <StatusTabs basePath={basePath} query={query} />
         </div>

         {clients.length === 0 ? (
            <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center'>
               <Contact className='size-8 text-muted-foreground' aria-hidden='true' />
               {query.q ? (
                  <>
                     <p className='font-medium'>
                        No {archived && 'archived '}clients match &ldquo;{query.q}&rdquo;
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
                     <p className='font-medium'>No archived clients</p>
                     <p className='text-sm text-muted-foreground'>
                        Clients you archive are kept here, with their projects and invoices.
                     </p>
                  </>
               ) : (
                  <>
                     <p className='font-medium'>No clients yet</p>
                     <p className='text-sm text-muted-foreground'>
                        Clients you add will show up here.
                     </p>
                     {canCreate && <div className='mt-2'>{newClientLink}</div>}
                  </>
               )}
            </div>
         ) : (
            <>
               <Table>
                  <TableHeader>
                     <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className='hidden sm:table-cell'>Email</TableHead>
                        <TableHead className='text-right'>Projects</TableHead>
                        <TableHead className='hidden text-right sm:table-cell'>
                           {archived ? 'Archived' : 'Added'}
                        </TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {clients.map((client) => (
                        <TableRow key={client.id}>
                           <TableCell>
                              <Link
                                 href={`${basePath}/${client.id}`}
                                 className='font-medium underline-offset-4 hover:underline'
                              >
                                 {client.name}
                              </Link>
                              {client.company && (
                                 <div className='text-xs text-muted-foreground'>
                                    {client.company}
                                 </div>
                              )}
                              {client.email && (
                                 <div className='text-xs text-muted-foreground sm:hidden'>
                                    {client.email}
                                 </div>
                              )}
                           </TableCell>
                           <TableCell className='hidden text-muted-foreground sm:table-cell'>
                              {client.email ?? '—'}
                           </TableCell>
                           <TableCell className='text-right tabular-nums'>
                              {client._count.projects}
                           </TableCell>
                           <TableCell className='hidden text-right text-muted-foreground sm:table-cell'>
                              {formatDate(client.archivedAt ?? client.createdAt, timeZone)}
                           </TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>

               <ListPagination
                  basePath={basePath}
                  query={query}
                  page={page}
                  pageCount={pageCount}
                  pageSize={pageSize}
                  total={total}
                  noun={['client', 'clients']}
               />
            </>
         )}
      </div>
   );
}
