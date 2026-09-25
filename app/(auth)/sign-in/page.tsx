import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';
import { SignInForm } from '../_components/sign-in-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage() {
   if (await getSession()) redirect('/dashboard');

   return (
      <Card>
         <CardHeader>
            <CardTitle className='text-xl'>Welcome back</CardTitle>
            <CardDescription>Sign in to your account.</CardDescription>
         </CardHeader>
         <CardContent>
            <SignInForm />
         </CardContent>
         <CardFooter className='justify-center text-sm text-muted-foreground'>
            Don&apos;t have an account?&nbsp;
            <Link href='/sign-up' className='font-medium text-foreground underline underline-offset-4'>
               Sign up
            </Link>
         </CardFooter>
      </Card>
   );
}
