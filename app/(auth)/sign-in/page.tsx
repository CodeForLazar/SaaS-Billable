import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
   Card,
   CardContent,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle
} from '@/components/ui/card';
import { authHref, safeRedirectPath } from '@/lib/safe-redirect';
import { getSession } from '@/lib/session';
import { SignInForm } from '../_components/sign-in-form';

export const metadata: Metadata = { title: 'Sign in' };

// Better Auth sends people here with ?error=... when a verification link can't be used.
const linkErrors: Record<string, string> = {
   TOKEN_EXPIRED: 'That confirmation link has expired. Sign in and we’ll send you a new one.',
   INVALID_TOKEN: 'That confirmation link is invalid. Sign in and we’ll send you a new one.'
};

export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
   const { error, reset, redirectTo: rawRedirectTo, email } = await searchParams;
   const redirectTo = safeRedirectPath(rawRedirectTo);
   const defaultEmail = typeof email === 'string' ? email : undefined;

   // Signed in (including right after clicking a valid confirmation link)? Continue where they
   // were going (e.g. an invitation), otherwise to their workspace.
   if (await getSession()) redirect(redirectTo ?? '/dashboard');

   const linkError =
      typeof error === 'string'
         ? (linkErrors[error] ?? 'Something went wrong. Please try again.')
         : null;

   return (
      <Card>
         <CardHeader>
            <CardTitle className='text-xl'>Welcome back</CardTitle>
            <CardDescription>Sign in to your account.</CardDescription>
         </CardHeader>
         <CardContent className='flex flex-col gap-6'>
            {reset === 'success' && (
               <Alert>
                  <AlertDescription>
                     Your password has been changed. Sign in with your new password.
                  </AlertDescription>
               </Alert>
            )}
            {linkError && (
               <Alert variant='destructive'>
                  <AlertDescription>{linkError}</AlertDescription>
               </Alert>
            )}
            <SignInForm redirectTo={redirectTo} defaultEmail={defaultEmail} />
         </CardContent>
         <CardFooter className='justify-center text-sm text-muted-foreground'>
            Don&apos;t have an account?&nbsp;
            <Link
               href={authHref('/sign-up', { redirectTo, email: defaultEmail })}
               className='font-medium text-foreground underline underline-offset-4'
            >
               Sign up
            </Link>
         </CardFooter>
      </Card>
   );
}
