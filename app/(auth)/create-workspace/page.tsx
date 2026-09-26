import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';
import { CreateWorkspaceForm } from './create-workspace-form';

export const metadata: Metadata = { title: 'Create your workspace' };

export default async function CreateWorkspacePage() {
   if (!(await getSession())) redirect('/sign-in');

   return (
      <Card>
         <CardHeader>
            <CardTitle className='text-xl'>Create your workspace</CardTitle>
            <CardDescription>
               A workspace holds your clients, projects, time and invoices. You can invite teammates
               later.
            </CardDescription>
         </CardHeader>
         <CardContent>
            <CreateWorkspaceForm />
         </CardContent>
      </Card>
   );
}
