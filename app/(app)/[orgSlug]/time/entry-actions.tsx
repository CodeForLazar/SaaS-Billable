'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLinkItem,
   DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { deleteTimeEntryAction } from './actions';

// The "⋯" menu on a time entry: Edit (a page) or Delete (asks first).
export function EntryActions({
   orgSlug,
   entry
}: {
   orgSlug: string;
   entry: { id: string; label: string };
}) {
   const [pending, startTransition] = useTransition();
   const [confirmOpen, setConfirmOpen] = useState(false);

   function remove() {
      startTransition(async () => {
         const result = await deleteTimeEntryAction(orgSlug, entry.id);
         if (!result.ok) {
            toast.error(result.message);
            return;
         }
         setConfirmOpen(false);
         toast.success('Entry deleted.');
      });
   }

   return (
      <>
         <DropdownMenu>
            <DropdownMenuTrigger
               render={
                  <Button
                     variant='ghost'
                     size='icon-sm'
                     aria-label={`Actions for ${entry.label}`}
                     disabled={pending}
                  />
               }
            >
               <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-40'>
               <DropdownMenuLinkItem render={<Link href={`/${orgSlug}/time/${entry.id}/edit`} />}>
                  <Pencil aria-hidden='true' />
                  Edit
               </DropdownMenuLinkItem>
               <DropdownMenuItem variant='destructive' onClick={() => setConfirmOpen(true)}>
                  <Trash2 aria-hidden='true' />
                  Delete
               </DropdownMenuItem>
            </DropdownMenuContent>
         </DropdownMenu>

         <AlertDialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                  <AlertDialogDescription>
                     {entry.label}. This can&apos;t be undone.
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant='destructive' onClick={remove} disabled={pending}>
                     {pending ? 'Deleting…' : 'Delete'}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   );
}
