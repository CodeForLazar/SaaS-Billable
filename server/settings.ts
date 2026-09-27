import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { DEFAULT_CURRENCY } from '@/utils/money';
import { can } from '@/lib/permissions';
import type { BillingSettingsInput } from '@/validations/settings';
import { requireMembership } from '@/server/organizations';

// Values used until a workspace saves its billing settings (there's no row before that).
// They match the column defaults in prisma/schema/workspace-settings.prisma.
const DEFAULTS = {
   currency: DEFAULT_CURRENCY,
   businessName: null,
   businessEmail: null,
   businessAddress: null,
   invoicePrefix: 'INV-',
   nextInvoiceNumber: 1,
   paymentTermsDays: 14,
   taxRateBasisPoints: 0
};

/**
 * The workspace's billing settings (or the defaults). Any member may read them: the currency is
 * needed to show project rates. cache(): one query per request, however many components ask.
 */
export const getWorkspaceSettings = cache(async (orgSlug: string) => {
   const { organization } = await requireMembership(orgSlug);
   const row = await db.workspaceSettings.findUnique({
      where: { organizationId: organization.id },
      select: {
         currency: true,
         businessName: true,
         businessEmail: true,
         businessAddress: true,
         invoicePrefix: true,
         nextInvoiceNumber: true,
         paymentTermsDays: true,
         taxRateBasisPoints: true
      }
   });
   return { ...DEFAULTS, ...row };
});

export type SettingsResult = { ok: true } | { ok: false; message: string };

/** Saves the billing settings. Owners and admins (the same right as editing the workspace). */
export async function updateWorkspaceSettings(
   orgSlug: string,
   input: BillingSettingsInput
): Promise<SettingsResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { organization: ['update'] })) {
      return { ok: false, message: 'You are not allowed to change the billing settings.' };
   }

   const data = {
      businessName: input.businessName,
      businessEmail: input.businessEmail,
      businessAddress: input.businessAddress,
      currency: input.currency,
      invoicePrefix: input.invoicePrefix,
      nextInvoiceNumber: input.nextInvoiceNumber,
      paymentTermsDays: input.paymentTermsDays,
      taxRateBasisPoints: input.taxRate
   };
   // Upsert: the row is created on the first save.
   await db.workspaceSettings.upsert({
      where: { organizationId: organization.id },
      create: { organizationId: organization.id, ...data },
      update: data
   });
   return { ok: true };
}
