import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
   Card,
   CardContent,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle
} from '@/components/ui/card';
import { ResetPasswordForm } from '../_components/reset-password-form';

export const metadata: Metadata = { title: 'Reset password' };

// The reset email links to Better Auth, which checks the token and forwards here with
// ?token=... (valid) or ?error=INVALID_TOKEN (unknown, used or expired).
// No "already signed in" redirect: the link from the email must work either way.
export default async function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
   const { token, error } = await searchParams;
   const validToken = typeof token === 'string' && !error ? token : null;

   return (
      <Card>
         <CardHeader>
            <CardTitle className='text-xl'>Set a new password</CardTitle>
            <CardDescription>Choose a password with at least 8 characters.</CardDescription>
         </CardHeader>
         <CardContent>
            {validToken ? (
               <ResetPasswordForm token={validToken} />
            ) : (
               <Alert variant='destructive'>
                  <AlertDescription>
                     This reset link is invalid or has expired.{' '}
                     <Link
                        href='/forgot-password'
                        className='font-medium underline underline-offset-4'
                     >
                        Request a new link
                     </Link>
                  </AlertDescription>
               </Alert>
            )}
         </CardContent>
         <CardFooter className='justify-center text-sm text-muted-foreground'>
            <Link
               href='/sign-in'
               className='font-medium text-foreground underline underline-offset-4'
            >
               Back to sign in
            </Link>
         </CardFooter>
      </Card>
   );
}
