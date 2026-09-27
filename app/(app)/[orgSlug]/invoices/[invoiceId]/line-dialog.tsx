'use client';

import { useActionState } from 'react';
import { toast } from 'sonner';
import { toFieldErrors } from '@/app/(auth)/_components/to-field-errors';
import { MoneyInput } from '@/components/money-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { LineFormState, LineValues } from '../actions';

type LineAction = (state: LineFormState, formData: FormData) => Promise<LineFormState>;

type Props = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   action: LineAction;
   title: string;
   submitLabel: string;
   successMessage: string;
   currency: string;
   defaultValues?: LineValues;
};

// Add or edit one invoice line in a dialog. The form is its own component inside the dialog's
// content, which unmounts when the dialog closes: every opening starts fresh.
export function LineDialog(props: Props) {
   return (
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>{props.title}</DialogTitle>
               <DialogDescription>
                  Quantity is hours for time, or units (e.g. 1 for a fixed fee).
               </DialogDescription>
            </DialogHeader>
            <LineForm {...props} />
         </DialogContent>
      </Dialog>
   );
}

function LineForm({
   action,
   onOpenChange,
   submitLabel,
   successMessage,
   currency,
   defaultValues = { description: '', quantity: '1', unitPrice: '' }
}: Props) {
   // Wrap the Server Action: on success close the dialog and say so; errors stay in the form.
   const [state, formAction, pending] = useActionState(
      async (previous: LineFormState, formData: FormData) => {
         const result = await action(previous, formData);
         if (result?.ok) {
            onOpenChange(false);
            toast.success(successMessage);
         }
         return result;
      },
      undefined
   );
   const errors = state?.fieldErrors;
   const values = state?.values ?? defaultValues;

   return (
      <form action={formAction} noValidate>
         <FieldGroup key={JSON.stringify(values)}>
            <Field data-invalid={!!errors?.description}>
               <FieldLabel htmlFor='line-description'>Description</FieldLabel>
               <Textarea
                  id='line-description'
                  name='description'
                  rows={2}
                  placeholder='e.g. Hosting, September'
                  defaultValue={values.description}
                  aria-invalid={!!errors?.description}
               />
               <FieldError errors={toFieldErrors(errors?.description)} />
            </Field>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field data-invalid={!!errors?.quantity}>
                  <FieldLabel htmlFor='line-quantity'>Quantity</FieldLabel>
                  <Input
                     id='line-quantity'
                     name='quantity'
                     inputMode='decimal'
                     autoComplete='off'
                     defaultValue={values.quantity}
                     aria-invalid={!!errors?.quantity}
                  />
                  <FieldDescription>Up to 2 decimals, e.g. 6.5</FieldDescription>
                  <FieldError errors={toFieldErrors(errors?.quantity)} />
               </Field>
               <Field data-invalid={!!errors?.unitPrice}>
                  <FieldLabel htmlFor='line-unit-price'>Price per unit</FieldLabel>
                  <MoneyInput
                     id='line-unit-price'
                     name='unitPrice'
                     currency={currency}
                     placeholder='0.00'
                     defaultValue={values.unitPrice}
                     aria-invalid={!!errors?.unitPrice}
                  />
                  <FieldError errors={toFieldErrors(errors?.unitPrice)} />
               </Field>
            </div>
            {state?.error && (
               <Alert variant='destructive'>
                  <AlertDescription>{state.error}</AlertDescription>
               </Alert>
            )}
            <DialogFooter>
               <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
                  Cancel
               </Button>
               <Button type='submit' disabled={pending}>
                  {pending ? 'Saving…' : submitLabel}
               </Button>
            </DialogFooter>
         </FieldGroup>
      </form>
   );
}
