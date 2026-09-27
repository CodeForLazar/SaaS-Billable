'use client';

import { useActionState } from 'react';
import { CircleCheck } from 'lucide-react';
import { toFieldErrors } from '@/app/(auth)/_components/to-field-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
   Field,
   FieldDescription,
   FieldError,
   FieldGroup,
   FieldLabel,
   FieldLegend,
   FieldSet
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
   InputGroup,
   InputGroupAddon,
   InputGroupInput,
   InputGroupText
} from '@/components/ui/input-group';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CURRENCIES } from '@/lib/money';
import type { BillingFormState, BillingValues } from './actions';

type BillingAction = (state: BillingFormState, formData: FormData) => Promise<BillingFormState>;

const currencyItems = CURRENCIES.map((currency) => ({
   value: currency.code,
   label: `${currency.code} · ${currency.label}`
}));

export function BillingForm({
   action,
   defaultValues,
   workspaceName
}: {
   action: BillingAction;
   defaultValues: BillingValues;
   workspaceName: string;
}) {
   const [state, formAction, pending] = useActionState(action, undefined);
   const errors = state?.fieldErrors;
   // What was typed (after a save or a failed save), else the stored settings.
   const values = state?.values ?? defaultValues;
   const field = (name: keyof BillingValues) => ({
      id: name,
      name,
      defaultValue: values[name],
      'aria-invalid': !!errors?.[name]
   });

   return (
      <form action={formAction} noValidate>
         {/* key: remount the fields with the new values after a save (see the decision log) */}
         <FieldGroup key={JSON.stringify(values)}>
            <FieldSet>
               <FieldLegend>Your business</FieldLegend>
               <FieldDescription>Shown as the sender on your invoices.</FieldDescription>
               <FieldGroup>
                  <div className='grid gap-6 sm:grid-cols-2'>
                     <Field data-invalid={!!errors?.businessName}>
                        <FieldLabel htmlFor='businessName'>Name</FieldLabel>
                        <Input {...field('businessName')} placeholder={workspaceName} />
                        <FieldDescription>Empty: the workspace name.</FieldDescription>
                        <FieldError errors={toFieldErrors(errors?.businessName)} />
                     </Field>
                     <Field data-invalid={!!errors?.businessEmail}>
                        <FieldLabel htmlFor='businessEmail'>Email</FieldLabel>
                        <Input
                           {...field('businessEmail')}
                           type='email'
                           placeholder='billing@example.com'
                        />
                        <FieldDescription>Clients reply to this address.</FieldDescription>
                        <FieldError errors={toFieldErrors(errors?.businessEmail)} />
                     </Field>
                  </div>
                  <Field data-invalid={!!errors?.businessAddress}>
                     <FieldLabel htmlFor='businessAddress'>Address</FieldLabel>
                     <Textarea
                        {...field('businessAddress')}
                        rows={3}
                        placeholder={'Street and number\nPostcode and city\nCountry\nVAT number'}
                     />
                     <FieldError errors={toFieldErrors(errors?.businessAddress)} />
                  </Field>
               </FieldGroup>
            </FieldSet>

            <FieldSet>
               <FieldLegend>Invoices</FieldLegend>
               <FieldDescription>Defaults for new invoices.</FieldDescription>
               <FieldGroup>
                  <div className='grid gap-6 sm:grid-cols-2'>
                     <Field data-invalid={!!errors?.currency}>
                        <FieldLabel htmlFor='currency'>Currency</FieldLabel>
                        <Select
                           name='currency'
                           items={currencyItems}
                           defaultValue={values.currency}
                        >
                           <SelectTrigger
                              id='currency'
                              className='w-full'
                              aria-invalid={!!errors?.currency}
                           >
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                              {currencyItems.map((item) => (
                                 <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                        <FieldDescription>
                           Also used for project rates. Invoices keep the currency they were created
                           with.
                        </FieldDescription>
                        <FieldError errors={toFieldErrors(errors?.currency)} />
                     </Field>
                     <Field data-invalid={!!errors?.taxRate}>
                        <FieldLabel htmlFor='taxRate'>Tax rate</FieldLabel>
                        <InputGroup>
                           <InputGroupInput
                              {...field('taxRate')}
                              inputMode='decimal'
                              autoComplete='off'
                              placeholder='0'
                           />
                           <InputGroupAddon align='inline-end'>
                              <InputGroupText>%</InputGroupText>
                           </InputGroupAddon>
                        </InputGroup>
                        <FieldDescription>VAT or sales tax, e.g. 20 or 8.25.</FieldDescription>
                        <FieldError errors={toFieldErrors(errors?.taxRate)} />
                     </Field>
                  </div>
                  <div className='grid gap-6 sm:grid-cols-3'>
                     <Field data-invalid={!!errors?.invoicePrefix}>
                        <FieldLabel htmlFor='invoicePrefix'>Number prefix</FieldLabel>
                        <Input {...field('invoicePrefix')} placeholder='INV-' autoComplete='off' />
                        <FieldError errors={toFieldErrors(errors?.invoicePrefix)} />
                     </Field>
                     <Field data-invalid={!!errors?.nextInvoiceNumber}>
                        <FieldLabel htmlFor='nextInvoiceNumber'>Next number</FieldLabel>
                        <Input
                           {...field('nextInvoiceNumber')}
                           inputMode='numeric'
                           autoComplete='off'
                        />
                        <FieldError errors={toFieldErrors(errors?.nextInvoiceNumber)} />
                     </Field>
                     <Field data-invalid={!!errors?.paymentTermsDays}>
                        <FieldLabel htmlFor='paymentTermsDays'>Payment terms</FieldLabel>
                        <InputGroup>
                           <InputGroupInput
                              {...field('paymentTermsDays')}
                              inputMode='numeric'
                              autoComplete='off'
                           />
                           <InputGroupAddon align='inline-end'>
                              <InputGroupText>days</InputGroupText>
                           </InputGroupAddon>
                        </InputGroup>
                        <FieldError errors={toFieldErrors(errors?.paymentTermsDays)} />
                     </Field>
                  </div>
                  <FieldDescription>
                     Invoices are numbered when they&apos;re sent: the next one gets{' '}
                     <span className='font-medium text-foreground'>
                        {values.invoicePrefix}
                        {values.nextInvoiceNumber.padStart(4, '0')}
                     </span>
                     . Due date = issue date + payment terms.
                  </FieldDescription>
               </FieldGroup>
            </FieldSet>

            {state?.error && (
               <Alert variant='destructive'>
                  <AlertDescription>{state.error}</AlertDescription>
               </Alert>
            )}
            {state?.saved && (
               <Alert>
                  <CircleCheck />
                  <AlertDescription>Billing settings saved.</AlertDescription>
               </Alert>
            )}

            <Button type='submit' disabled={pending} className='self-start'>
               {pending ? 'Saving…' : 'Save settings'}
            </Button>
         </FieldGroup>
      </form>
   );
}
