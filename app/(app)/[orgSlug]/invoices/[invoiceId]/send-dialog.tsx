'use client';

import { useState, useTransition } from 'react';
import { Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import type { SendResult } from '../actions';

// "Send invoice": explains what happens (numbered, dated, locked) and offers to email it.
export function SendDialog({
   action,
   clientEmail,
   nextNumber,
   paymentTermsDays
}: {
   action: (email: boolean) => Promise<SendResult>;
   clientEmail: string | null;
   nextNumber: string;
   paymentTermsDays: number;
}) {
   const [open, setOpen] = useState(false);
   const [email, setEmail] = useState(!!clientEmail);
   const [pending, startTransition] = useTransition();

   function send() {
      startTransition(async () => {
         const result = await action(email && !!clientEmail);
         if (!result.ok) {
            toast.error(result.message);
            return;
         }
         setOpen(false);
         if (result.warning) toast.warning(`Invoice sent, but: ${result.warning}`);
         else
            toast.success(result.emailed ? `Invoice emailed to ${clientEmail}.` : 'Invoice sent.');
      });
   }

   return (
      <>
         <Button onClick={() => setOpen(true)}>
            <Send aria-hidden='true' />
            Send invoice
         </Button>
         <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Send this invoice?</DialogTitle>
                  <DialogDescription>
                     It becomes <strong>{nextNumber}</strong>, dated today and due in{' '}
                     {paymentTermsDays} days. After sending it can&apos;t be edited (you can void it
                     and create a new one).
                  </DialogDescription>
               </DialogHeader>
               {clientEmail ? (
                  <Field orientation='horizontal'>
                     <Checkbox
                        id='send-email'
                        checked={email}
                        onCheckedChange={(checked) => setEmail(checked === true)}
                     />
                     <FieldLabel htmlFor='send-email' className='font-normal'>
                        <Mail className='size-4' aria-hidden='true' />
                        Email it to {clientEmail} (PDF attached)
                     </FieldLabel>
                  </Field>
               ) : (
                  <p className='text-sm text-muted-foreground'>
                     The client has no email address, so it won&apos;t be emailed. You can share its
                     link or PDF yourself, or add an email to the client first.
                  </p>
               )}
               <DialogFooter>
                  <Button variant='outline' onClick={() => setOpen(false)} disabled={pending}>
                     Cancel
                  </Button>
                  <Button onClick={send} disabled={pending}>
                     {pending ? 'Sending…' : 'Send invoice'}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </>
   );
}
