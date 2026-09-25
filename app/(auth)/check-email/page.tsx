import type { Metadata } from 'next';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Check your email' };

// Shown after sign-up. searchParams is a Promise in Next.js 16, so it's awaited.
export default async function CheckEmailPage({ searchParams }: PageProps<'/check-email'>) {
   const { email } = await searchParams;

   return (
      <Card>
         <CardHeader>
            <MailCheck className='mb-2 size-8 text-muted-foreground' />
            <CardTitle className='text-xl'>Check your email</CardTitle>
            <CardDescription>
               We sent a confirmation link to{' '}
               {typeof email === 'string' ? <strong className='text-foreground'>{email}</strong> : 'your email address'}.
               Click it to activate your account. The link expires in 1 hour.
            </CardDescription>
         </CardHeader>
         <CardFooter className='justify-center text-sm text-muted-foreground'>
            Link expired?&nbsp;
            <Link href='/sign-in' className='font-medium text-foreground underline underline-offset-4'>
               Sign in
            </Link>
            &nbsp;to get a new one.
         </CardFooter>
      </Card>
   );
}
