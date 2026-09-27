import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { can } from '@/lib/permissions';
import { getClient } from '@/server/clients';
import { updateClientAction } from '../../actions';
import { ClientForm } from '../../client-form';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/clients/[clientId]/edit'>): Promise<Metadata> {
   const { orgSlug, clientId } = await params;
   const { organization, client } = await getClient(orgSlug, clientId);
   return { title: `Edit ${client.name} · ${organization.name}` };
}

export default async function EditClientPage({
   params
}: PageProps<'/[orgSlug]/clients/[clientId]/edit'>) {
   const { orgSlug, clientId } = await params;
   const { organization, role, client } = await getClient(orgSlug, clientId);
   if (!can(role, { client: ['update'] })) notFound();

   const clientPath = `/${organization.slug}/clients/${client.id}`;

   return (
      <div className='flex w-full max-w-2xl flex-1 flex-col gap-6 p-6'>
         <div>
            <h1 className='text-2xl font-semibold'>Edit client</h1>
            <p className='text-muted-foreground'>{client.name}</p>
         </div>
         <ClientForm
            action={updateClientAction.bind(null, organization.slug, client.id)}
            defaultValues={{
               name: client.name,
               company: client.company ?? '',
               email: client.email ?? '',
               address: client.address ?? '',
               notes: client.notes ?? ''
            }}
            submitLabel='Save changes'
            cancelHref={clientPath}
         />
      </div>
   );
}
