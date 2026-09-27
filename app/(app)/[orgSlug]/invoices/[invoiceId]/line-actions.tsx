'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
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
   DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { InvoiceResult } from '@/server/invoices';
import type { LineFormState, LineValues } from '../actions';
import { LineDialog } from './line-dialog';

type LineAction = (state: LineFormState, formData: FormData) => Promise<LineFormState>;

/** "Add line" under a draft's lines. */
export function AddLineButton({ action, currency }: { action: LineAction; currency: string }) {
   const [open, setOpen] = useState(false);
   return (
      <>
         <Button variant='outline' onClick={() => setOpen(true)}>
            <Plus aria-hidden='true' />
            Add line
         </Button>
         <LineDialog
            open={open}
            onOpenChange={setOpen}
            action={action}
            title='Add a line'
            submitLabel='Add line'
            successMessage='Line added.'
            currency={currency}
         />
      </>
   );
}

/** The ⋯ menu on a draft's line: edit it (dialog) or remove it (asks first). */
export function LineActions({
   line,
   updateAction,
   deleteAction,
   currency,
   billsTime
}: {
   line: { description: string; values: LineValues };
   updateAction: LineAction;
   deleteAction: () => Promise<InvoiceResult>;
   currency: string;
   /** The line bills tracked time: removing it makes that time unbilled again. */
   billsTime: boolean;
}) {
   const [editOpen, setEditOpen] = useState(false);
   const [confirmOpen, setConfirmOpen] = useState(false);
   const [pending, startTransition] = useTransition();

   function remove() {
      startTransition(async () => {
         const result = await deleteAction();
         if (!result.ok) {
            toast.error(result.message);
            return;
         }
         setConfirmOpen(false);
         toast.success('Line removed.');
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
                     aria-label={`Actions for ${line.description}`}
                  />
               }
            >
               <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-40'>
               <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil aria-hidden='true' />
                  Edit
               </DropdownMenuItem>
               <DropdownMenuItem variant='destructive' onClick={() => setConfirmOpen(true)}>
                  <Trash2 aria-hidden='true' />
                  Remove
               </DropdownMenuItem>
            </DropdownMenuContent>
         </DropdownMenu>

         <LineDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            action={updateAction}
            title='Edit line'
            submitLabel='Save line'
            successMessage='Line saved.'
            currency={currency}
            defaultValues={line.values}
         />

         <AlertDialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Remove this line?</AlertDialogTitle>
                  <AlertDialogDescription>
                     {line.description}.
                     {billsTime && ' Its time becomes unbilled again, so you can invoice it later.'}
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant='destructive' onClick={remove} disabled={pending}>
                     {pending ? 'Removing…' : 'Remove'}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   );
}
