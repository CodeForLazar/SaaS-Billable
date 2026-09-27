'use client';

import { useState, useTransition } from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type Props = {
   /** A Server Action with the record already bound: setClientArchivedAction.bind(null, orgSlug, id) */
   action: (archived: boolean) => Promise<{ ok: true } | { ok: false; message: string }>;
   name: string;
   archived: boolean;
   /** What archiving does, shown in the confirmation dialog. */
   description: string;
};

// Archive (asks first) or Restore (no need to ask: nothing is lost either way). Used for clients
// and projects. The action calls refresh(), so the page re-renders with the new state.
export function ArchiveButton({ action, name, archived, description }: Props) {
   const [pending, startTransition] = useTransition();
   const [confirmOpen, setConfirmOpen] = useState(false);

   function setArchived(value: boolean) {
      startTransition(async () => {
         const result = await action(value);
         if (!result.ok) {
            toast.error(result.message);
            return;
         }
         setConfirmOpen(false);
         toast.success(value ? `${name} was archived.` : `${name} was restored.`);
      });
   }

   if (archived) {
      return (
         <Button variant='outline' onClick={() => setArchived(false)} disabled={pending}>
            <ArchiveRestore aria-hidden='true' />
            {pending ? 'Restoring…' : 'Restore'}
         </Button>
      );
   }

   return (
      <>
         <Button variant='outline' onClick={() => setConfirmOpen(true)}>
            <Archive aria-hidden='true' />
            Archive
         </Button>
         <AlertDialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Archive {name}?</AlertDialogTitle>
                  <AlertDialogDescription>{description}</AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setArchived(true)} disabled={pending}>
                     {pending ? 'Archiving…' : 'Archive'}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   );
}
