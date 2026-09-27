'use client';

import { useActionState } from 'react';
import { CircleCheck } from 'lucide-react';
import { toFieldErrors } from '@/app/(auth)/_components/to-field-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
   InputGroup,
   InputGroupAddon,
   InputGroupInput,
   InputGroupText
} from '@/components/ui/input-group';
import { Textarea } from '@/components/ui/textarea';
import type { DetailValues, DetailsFormState } from '../actions';

type DetailsAction = (state: DetailsFormState, formData: FormData) => Promise<DetailsFormState>;

// A draft's tax rate, payment terms and notes. Saving recalculates the totals on the server.
export function DetailsForm({
   action,
   defaultValues
}: {
   action: DetailsAction;
   defaultValues: DetailValues;
}) {
   const [state, formAction, pending] = useActionState(action, undefined);
   const errors = state?.fieldErrors;
   const values = state?.values ?? defaultValues;

   return (
      <form action={formAction} noValidate>
         <FieldGroup key={JSON.stringify(values)}>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field data-invalid={!!errors?.taxRate}>
                  <FieldLabel htmlFor='taxRate'>Tax rate</FieldLabel>
                  <InputGroup>
                     <InputGroupInput
                        id='taxRate'
                        name='taxRate'
                        inputMode='decimal'
                        autoComplete='off'
                        placeholder='0'
                        defaultValue={values.taxRate}
                        aria-invalid={!!errors?.taxRate}
                     />
                     <InputGroupAddon align='inline-end'>
                        <InputGroupText>%</InputGroupText>
                     </InputGroupAddon>
                  </InputGroup>
                  <FieldError errors={toFieldErrors(errors?.taxRate)} />
               </Field>
               <Field data-invalid={!!errors?.paymentTermsDays}>
                  <FieldLabel htmlFor='paymentTermsDays'>Payment terms</FieldLabel>
                  <InputGroup>
                     <InputGroupInput
                        id='paymentTermsDays'
                        name='paymentTermsDays'
                        inputMode='numeric'
                        autoComplete='off'
                        defaultValue={values.paymentTermsDays}
                        aria-invalid={!!errors?.paymentTermsDays}
                     />
                     <InputGroupAddon align='inline-end'>
                        <InputGroupText>days</InputGroupText>
                     </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>Due date = the day you send it + this.</FieldDescription>
                  <FieldError errors={toFieldErrors(errors?.paymentTermsDays)} />
               </Field>
            </div>
            <Field data-invalid={!!errors?.notes}>
               <FieldLabel htmlFor='notes'>Notes</FieldLabel>
               <Textarea
                  id='notes'
                  name='notes'
                  rows={3}
                  placeholder='Payment details, a thank-you...'
                  defaultValue={values.notes}
                  aria-invalid={!!errors?.notes}
               />
               <FieldDescription>Printed at the bottom of the invoice.</FieldDescription>
               <FieldError errors={toFieldErrors(errors?.notes)} />
            </Field>
            {state?.error && (
               <Alert variant='destructive'>
                  <AlertDescription>{state.error}</AlertDescription>
               </Alert>
            )}
            {state?.saved && (
               <Alert>
                  <CircleCheck />
                  <AlertDescription>Saved.</AlertDescription>
               </Alert>
            )}
            <Button type='submit' variant='outline' disabled={pending} className='self-start'>
               {pending ? 'Saving…' : 'Save details'}
            </Button>
         </FieldGroup>
      </form>
   );
}
