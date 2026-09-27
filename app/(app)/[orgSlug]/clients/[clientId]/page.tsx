import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import { can } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { getClient } from '@/server/clients';

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
   const clientsPath = `/${organization.slug}/clients`;

   return (
      <div className='flex w-full max-w-3xl flex-1 flex-col gap-6 p-6'>
         <Link
            href={clientsPath}
            className='flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
         >
            <ArrowLeft className='size-4' aria-hidden='true' />
            All clients
         </Link>

         <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='min-w-0'>
               <div className='flex items-center gap-2'>
                  <h1 className='text-2xl font-semibold break-words'>{client.name}</h1>
                  {client.archivedAt && <Badge variant='secondary'>Archived</Badge>}
               </div>
               {client.company && <p className='text-muted-foreground'>{client.company}</p>}
            </div>
            {can(role, { client: ['update'] }) && (
               <Link
                  href={`${clientsPath}/${client.id}/edit`}
                  className={cn(buttonVariants({ variant: 'outline' }))}
               >
                  <Pencil aria-hidden='true' />
                  Edit
               </Link>
            )}
         </div>

         <dl className='flex flex-col gap-4 rounded-lg border p-6 text-sm'>
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
            <Detail label='Added'>{formatDate(client.createdAt)}</Detail>
         </dl>
      </div>
   );
}

// One label/value row: stacked on phones, side by side from sm up.
function Detail({
   label,
   className,
   children
}: {
   label: string;
   className?: string;
   children: React.ReactNode;
}) {
   return (
      <div className='grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-6'>
         <dt className='text-muted-foreground'>{label}</dt>
         <dd className={className}>{children}</dd>
      </div>
   );
}
