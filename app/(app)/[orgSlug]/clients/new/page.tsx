import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/permissions';
import { requireMembership } from '@/server/organizations';
import { createClientAction } from '../actions';
import { ClientForm } from '../client-form';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/clients/new'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `New client · ${organization.name}` };
}

export default async function NewClientPage({ params }: PageProps<'/[orgSlug]/clients/new'>) {
   const { organization, role } = await requireMembership((await params).orgSlug);
   // Members can't add clients: same 404 as any page they can't use. The action checks again.
   if (!can(role, { client: ['create'] })) notFound();

   const clientsPath = `/${organization.slug}/clients`;

   return (
      <div className='flex w-full max-w-2xl flex-1 flex-col gap-6 p-6'>
         <div>
            <h1 className='text-2xl font-semibold'>New client</h1>
            <p className='text-muted-foreground'>Someone you work for and send invoices to.</p>
         </div>
         <ClientForm
            action={createClientAction.bind(null, organization.slug)}
            submitLabel='Add client'
            cancelHref={clientsPath}
         />
      </div>
   );
}
