import { notFound } from 'next/navigation';
import { can } from '@/lib/permissions';
import { requireMembership } from '@/server/organizations';

// A guard for the whole invoices section: members (no invoice rights) get a 404 here, BEFORE the
// list's loading skeleton starts streaming. A check only inside a page behind a loading.tsx
// would come too late for the HTTP status (the response is already on its way as 200).
// The pages and services still check themselves: layouts don't re-run on client navigation.
export default async function InvoicesLayout({
   children,
   params
}: LayoutProps<'/[orgSlug]/invoices'>) {
   const { role } = await requireMembership((await params).orgSlug);
   if (!can(role, { invoice: ['read'] })) notFound();
   return children;
}
