import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';
import { SignUpForm } from '../_components/sign-up-form';

export const metadata: Metadata = { title: 'Sign up' };

export default async function SignUpPage() {
   // Already signed in? Nothing to do here.
   if (await getSession()) redirect('/dashboard');

   return (
      <Card>
         <CardHeader>
            <CardTitle className='text-xl'>Create your account</CardTitle>
            <CardDescription>Start tracking time and sending invoices.</CardDescription>
         </CardHeader>
         <CardContent>
            <SignUpForm />
         </CardContent>
         <CardFooter className='justify-center text-sm text-muted-foreground'>
            Already have an account?&nbsp;
            <Link href='/sign-in' className='font-medium text-foreground underline underline-offset-4'>
               Sign in
            </Link>
         </CardFooter>
      </Card>
   );
}
