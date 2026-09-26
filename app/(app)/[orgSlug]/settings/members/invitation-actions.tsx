'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cancelInvitationAction, leaveWorkspaceAction } from './actions';

export function CancelInvitationButton({ orgSlug, invitationId, email }: { orgSlug: string; invitationId: string; email: string }) {
   const [pending, startTransition] = useTransition();

   return (
      <Button
         variant='ghost'
         size='sm'
         disabled={pending}
         onClick={() =>
            startTransition(async () => {
               const result = await cancelInvitationAction(orgSlug, invitationId);
               if (result.ok) toast.success(`Invitation to ${email} cancelled.`);
               else toast.error(result.message);
            })
         }
      >
         {pending ? 'Cancelling…' : 'Cancel'}
      </Button>
   );
}

export function LeaveWorkspaceButton({ orgSlug, organizationName }: { orgSlug: string; organizationName: string }) {
   const [pending, startTransition] = useTransition();
   const [open, setOpen] = useState(false);

   return (
      <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
         <AlertDialogTrigger render={<Button variant='outline' />}>Leave workspace</AlertDialogTrigger>
         <AlertDialogContent>
            <AlertDialogHeader>
               <AlertDialogTitle>Leave {organizationName}?</AlertDialogTitle>
               <AlertDialogDescription>
                  You&apos;ll lose access to this workspace. Someone will have to invite you again to come back.
               </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
               <AlertDialogCancel disabled={pending}>Stay</AlertDialogCancel>
               <AlertDialogAction
                  variant='destructive'
                  disabled={pending}
                  onClick={() =>
                     startTransition(async () => {
                        // On success the action redirects, so we only get here on failure.
                        const result = await leaveWorkspaceAction(orgSlug);
                        if (!result.ok) {
                           setOpen(false);
                           toast.error(result.message);
                        }
                     })
                  }
               >
                  {pending ? 'Leaving…' : 'Leave'}
               </AlertDialogAction>
            </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>
   );
}
