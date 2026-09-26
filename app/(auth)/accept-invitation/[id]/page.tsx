import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authHref } from '@/lib/safe-redirect';
import { getSession } from '@/lib/session';
import { cn } from '@/lib/utils';
import { getOpenInvitation } from '@/server/invitations';
import { acceptInvitationAction, declineInvitationAction, switchAccountAction } from './actions';
import { InvitationResponse } from './invitation-response';

export const metadata: Metadata = { title: 'Invitation' };

// Opened from the invitation email. Public (see proxy.ts), because the invitee may not be signed
// in or may not even have an account yet. Four situations, one card each.
export default async function AcceptInvitationPage({ params }: PageProps<'/accept-invitation/[id]'>) {
   const { id } = await params;
   const invitation = await getOpenInvitation(id);

   // 1. Unknown, expired, already accepted/declined/cancelled
   if (!invitation) {
      return (
         <Card>
            <CardHeader>
               <CardTitle className='text-xl'>Invitation not valid</CardTitle>
               <CardDescription>
                  This invitation has expired or was already used. Ask the person who invited you to send a new one.
               </CardDescription>
            </CardHeader>
            <CardContent>
               <Link href='/dashboard' className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
                  Go to the app
               </Link>
            </CardContent>
         </Card>
      );
   }

   const session = await getSession();
   const here = `/accept-invitation/${invitation.id}`;
   const title = `Join ${invitation.organization.name}`;
   const description = (
      <>
         <strong className='text-foreground'>{invitation.inviterName}</strong> invited you to join{' '}
         <strong className='text-foreground'>{invitation.organization.name}</strong> as{' '}
         {invitation.role === 'admin' ? 'an' : 'a'} <strong className='text-foreground'>{invitation.role}</strong>.
      </>
   );

   // 2. Not signed in: sign in or create an account, then come back here
   if (!session) {
      return (
         <Card>
            <CardHeader>
               <CardTitle className='text-xl'>{title}</CardTitle>
               <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-2'>
               <Link
                  href={authHref('/sign-in', { redirectTo: here, email: invitation.email })}
                  className={cn(buttonVariants(), 'w-full')}
               >
                  Sign in to accept
               </Link>
               <Link
                  href={authHref('/sign-up', { redirectTo: here, email: invitation.email })}
                  className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
               >
                  Create an account
               </Link>
            </CardContent>
         </Card>
      );
   }

   // 3. Signed in, but as someone other than the invitee
   if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return (
         <Card>
            <CardHeader>
               <CardTitle className='text-xl'>{title}</CardTitle>
               <CardDescription>
                  This invitation was sent to <strong className='text-foreground'>{invitation.email}</strong>, but
                  you&apos;re signed in as <strong className='text-foreground'>{session.user.email}</strong>.
               </CardDescription>
            </CardHeader>
            <CardContent>
               <form action={switchAccountAction.bind(null, invitation.id)}>
                  <Button type='submit' className='w-full'>
                     Sign in as {invitation.email}
                  </Button>
               </form>
            </CardContent>
         </Card>
      );
   }

   // 4. Signed in as the invitee: accept or decline
   return (
      <Card>
         <CardHeader>
            <CardTitle className='text-xl'>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
         </CardHeader>
         <CardContent>
            <InvitationResponse
               accept={acceptInvitationAction.bind(null, invitation.id)}
               decline={declineInvitationAction.bind(null, invitation.id)}
            />
         </CardContent>
      </Card>
   );
}
