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
   AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type Result = { ok: true } | { ok: false; message: string } | undefined;

// A button that asks "are you sure?" and then calls a Server Action (with its arguments already
// bound by the page). Used for invoice status changes. If the action redirects, the success
// toast never shows: the next page takes over.
export function ConfirmActionButton({
   action,
   children,
   variant = 'outline',
   title,
   description,
   confirmLabel,
   pendingLabel,
   successMessage,
   destructive = false
}: {
   action: () => Promise<Result>;
   children: React.ReactNode;
   variant?: 'default' | 'outline' | 'destructive' | 'ghost' | 'secondary';
   title: string;
   description: string;
   confirmLabel: string;
   pendingLabel: string;
   successMessage?: string;
   destructive?: boolean;
}) {
   const [pending, startTransition] = useTransition();
   const [open, setOpen] = useState(false);

   function run() {
      startTransition(async () => {
         const result = await action();
         if (result && !result.ok) {
            toast.error(result.message);
            return;
         }
         setOpen(false);
         if (successMessage) toast.success(successMessage);
      });
   }

   return (
      <>
         <Button variant={variant} onClick={() => setOpen(true)}>
            {children}
         </Button>
         <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>{title}</AlertDialogTitle>
                  <AlertDialogDescription>{description}</AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                     variant={destructive ? 'destructive' : 'default'}
                     onClick={run}
                     disabled={pending}
                  >
                     {pending ? pendingLabel : confirmLabel}
                  </AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </>
   );
}
