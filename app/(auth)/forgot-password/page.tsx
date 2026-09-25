import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';
import { ForgotPasswordForm } from '../_components/forgot-password-form';

export const metadata: Metadata = { title: 'Forgot password' };

export default async function ForgotPasswordPage() {
   if (await getSession()) redirect('/dashboard');

   return (
      <Card>
         <CardHeader>
            <CardTitle className='text-xl'>Forgot your password?</CardTitle>
            <CardDescription>Enter your email and we&apos;ll send you a link to reset it.</CardDescription>
         </CardHeader>
         <CardContent>
            <ForgotPasswordForm />
         </CardContent>
         <CardFooter className='justify-center text-sm text-muted-foreground'>
            Remembered it?&nbsp;
            <Link href='/sign-in' className='font-medium text-foreground underline underline-offset-4'>
               Back to sign in
            </Link>
         </CardFooter>
      </Card>
   );
}
