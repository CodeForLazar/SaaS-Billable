import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/session';
import { SignInForm } from '../_components/sign-in-form';

export const metadata: Metadata = { title: 'Sign in' };

// Better Auth sends people here with ?error=... when a verification link can't be used.
const linkErrors: Record<string, string> = {
   TOKEN_EXPIRED: 'That confirmation link has expired. Sign in and we’ll send you a new one.',
   INVALID_TOKEN: 'That confirmation link is invalid. Sign in and we’ll send you a new one.'
};

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
   // Signed in (including right after clicking a valid confirmation link)? Go to the app.
   if (await getSession()) redirect('/dashboard');

   const { error } = await searchParams;
   const linkError = typeof error === 'string' ? (linkErrors[error] ?? 'Something went wrong. Please try again.') : null;

   return (
      <Card>
         <CardHeader>
            <CardTitle className='text-xl'>Welcome back</CardTitle>
            <CardDescription>Sign in to your account.</CardDescription>
         </CardHeader>
         <CardContent className='flex flex-col gap-6'>
            {linkError && (
               <Alert variant='destructive'>
                  <AlertDescription>{linkError}</AlertDescription>
               </Alert>
            )}
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
