import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { Contact, Search } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { clientListQuerySchema } from '@/lib/validations/client';
import { listClients } from '@/server/clients';
import { requireMembership } from '@/server/organizations';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/clients'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Clients · ${organization.name}` };
}

// Search and page live in the URL (?q=acme&page=2): the page is rendered on the server from them,
// so results can be bookmarked and shared, and the back button works.
export default async function ClientsPage({
   params,
   searchParams
}: PageProps<'/[orgSlug]/clients'>) {
   const { orgSlug } = await params;
   const query = clientListQuerySchema.parse(await searchParams);
   const { organization, clients, total, page, pageCount, pageSize } = await listClients(
      orgSlug,
      query
   );
   const basePath = `/${organization.slug}/clients`;

   // Keeps the search term when moving between pages.
   const pageHref = (target: number) => {
      const params = new URLSearchParams();
      if (query.q) params.set('q', query.q);
      if (target > 1) params.set('page', String(target));
      const qs = params.toString();
      return qs ? `${basePath}?${qs}` : basePath;
   };

   return (
      <div className='flex w-full max-w-5xl flex-1 flex-col gap-6 p-6'>
         <div>
            <h1 className='text-2xl font-semibold'>Clients</h1>
            <p className='text-muted-foreground'>The people and companies you work for.</p>
         </div>

         {/* next/form: a GET form that updates the URL (?q=...) with client-side navigation.
             It still works before JavaScript loads. No page field, so a new search starts at 1. */}
         <Form action={basePath} className='flex max-w-md gap-2'>
            <div className='relative flex-1'>
               <Search
                  className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground'
                  aria-hidden='true'
               />
               <Input
                  key={query.q}
                  name='q'
                  type='search'
                  defaultValue={query.q}
                  placeholder='Search by name, company or email'
                  aria-label='Search clients'
                  className='pl-8'
               />
            </div>
            <Button type='submit' variant='outline'>
               Search
            </Button>
         </Form>

         {clients.length === 0 ? (
            <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center'>
               <Contact className='size-8 text-muted-foreground' aria-hidden='true' />
               {query.q ? (
                  <>
                     <p className='font-medium'>No clients match &ldquo;{query.q}&rdquo;</p>
                     <Link href={basePath} className='text-sm underline underline-offset-4'>
                        Clear search
                     </Link>
                  </>
               ) : (
                  <>
                     <p className='font-medium'>No clients yet</p>
                     <p className='text-sm text-muted-foreground'>
                        Clients you add will show up here.
                     </p>
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
                        <TableHead className='hidden text-right sm:table-cell'>Added</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {clients.map((client) => (
                        <TableRow key={client.id}>
                           <TableCell>
                              <div className='font-medium'>{client.name}</div>
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
                              {formatDate(client.createdAt)}
                           </TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>

               <nav
                  aria-label='Pagination'
                  className='flex items-center justify-between gap-4 text-sm text-muted-foreground'
               >
                  <p>
                     {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}{' '}
                     {total === 1 ? 'client' : 'clients'}
                  </p>
                  {pageCount > 1 && (
                     <div className='flex items-center gap-2'>
                        {page > 1 ? (
                           <Link
                              href={pageHref(page - 1)}
                              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                           >
                              Previous
                           </Link>
                        ) : (
                           <Button variant='outline' size='sm' disabled>
                              Previous
                           </Button>
                        )}
                        <span>
                           Page {page} of {pageCount}
                        </span>
                        {page < pageCount ? (
                           <Link
                              href={pageHref(page + 1)}
                              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                           >
                              Next
                           </Link>
                        ) : (
                           <Button variant='outline' size='sm' disabled>
                              Next
                           </Button>
                        )}
                     </div>
                  )}
               </nav>
            </>
         )}
      </div>
   );
}
