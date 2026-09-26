import { redirect } from 'next/navigation';

// /acme-design -> /acme-design/dashboard (the dashboard page does the membership check)
export default async function WorkspaceRootPage({ params }: PageProps<'/[orgSlug]'>) {
   const { orgSlug } = await params;
   redirect(`/${orgSlug}/dashboard`);
}
