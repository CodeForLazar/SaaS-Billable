import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { basisPointsToPercent } from '@/lib/money';
import { can } from '@/lib/permissions';
import { requireMembership } from '@/server/organizations';
import { getWorkspaceSettings } from '@/server/settings';
import { saveBillingSettingsAction } from './actions';
import { BillingForm } from './billing-form';

export async function generateMetadata({
   params
}: PageProps<'/[orgSlug]/settings/billing'>): Promise<Metadata> {
   const { organization } = await requireMembership((await params).orgSlug);
   return { title: `Billing · ${organization.name}` };
}

export default async function BillingSettingsPage({
   params
}: PageProps<'/[orgSlug]/settings/billing'>) {
   const { orgSlug } = await params;
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { organization: ['update'] })) notFound();
   const settings = await getWorkspaceSettings(orgSlug);

   return (
      <div className='flex w-full max-w-3xl flex-1 flex-col gap-6 p-6'>
         <div>
            <h1 className='text-2xl font-semibold'>Billing</h1>
            <p className='text-muted-foreground'>How your invoices look and are numbered.</p>
         </div>
         <BillingForm
            action={saveBillingSettingsAction.bind(null, organization.slug)}
            workspaceName={organization.name}
            defaultValues={{
               businessName: settings.businessName ?? '',
               businessEmail: settings.businessEmail ?? '',
               businessAddress: settings.businessAddress ?? '',
               currency: settings.currency,
               invoicePrefix: settings.invoicePrefix,
               nextInvoiceNumber: String(settings.nextInvoiceNumber),
               paymentTermsDays: String(settings.paymentTermsDays),
               taxRate: basisPointsToPercent(settings.taxRateBasisPoints)
            }}
         />
      </div>
   );
}
