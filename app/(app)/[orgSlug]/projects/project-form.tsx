'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { toFieldErrors } from '@/app/(auth)/_components/to-field-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MoneyInput } from '@/components/money-input';
import { Button, buttonVariants } from '@/components/ui/button';
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
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue
} from '@/components/ui/select';
import { PROJECT_COLORS } from '@/utils/project-colors';
import { cn } from '@/lib/utils';
import type { ProjectFormState, ProjectValues } from './actions';

type ProjectAction = (state: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;

// Used by both "New project" and "Edit project". The page passes the bound Server Action,
// the clients to choose from, the starting values and where Cancel goes.
export function ProjectForm({
   action,
   clients,
   defaultValues,
   submitLabel,
   cancelHref,
   currency
}: {
   action: ProjectAction;
   /** The workspace's currency (billing settings), shown with the rate. */
   currency: string;
   clients: { value: string; label: string }[];
   defaultValues: ProjectValues;
   submitLabel: string;
   cancelHref: string;
}) {
   const [state, formAction, pending] = useActionState(action, undefined);
   const errors = state?.fieldErrors;
   // After a failed save, show what was typed (React resets the form when an action finishes).
   const values = state?.values ?? defaultValues;

   return (
      <form action={formAction} noValidate>
         <FieldGroup>
            <Field data-invalid={!!errors?.name}>
               <FieldLabel htmlFor='name'>Name</FieldLabel>
               <Input
                  key={values.name}
                  id='name'
                  name='name'
                  placeholder='Website redesign'
                  autoComplete='off'
                  defaultValue={values.name}
                  aria-invalid={!!errors?.name}
               />
               <FieldError errors={toFieldErrors(errors?.name)} />
            </Field>

            <div className='grid gap-6 sm:grid-cols-2'>
               <Field data-invalid={!!errors?.clientId}>
                  <FieldLabel htmlFor='clientId'>Client</FieldLabel>
                  {/* name='clientId' adds a hidden input, so the form submits the chosen id */}
                  <Select
                     key={values.clientId}
                     name='clientId'
                     items={clients}
                     defaultValue={values.clientId || null}
                  >
                     <SelectTrigger
                        id='clientId'
                        className='w-full'
                        aria-invalid={!!errors?.clientId}
                     >
                        <SelectValue placeholder='Choose a client' />
                     </SelectTrigger>
                     <SelectContent>
                        {clients.map((client) => (
                           <SelectItem key={client.value} value={client.value}>
                              {client.label}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
                  <FieldError errors={toFieldErrors(errors?.clientId)} />
               </Field>

               <Field data-invalid={!!errors?.hourlyRate}>
                  <FieldLabel htmlFor='hourlyRate'>Hourly rate</FieldLabel>
                  <MoneyInput
                     key={values.hourlyRate}
                     id='hourlyRate'
                     name='hourlyRate'
                     currency={currency}
                     suffix='/ hour'
                     placeholder='75.00'
                     defaultValue={values.hourlyRate}
                     aria-invalid={!!errors?.hourlyRate}
                  />
                  <FieldDescription>
                     In {currency}. Leave empty if you don&apos;t bill by the hour.
                  </FieldDescription>
                  <FieldError errors={toFieldErrors(errors?.hourlyRate)} />
               </Field>
            </div>

            {/* Real radio buttons (visually hidden) with a colored circle as their look: arrow keys,
                focus and form submission work like any radio group. */}
            <FieldSet data-invalid={!!errors?.color}>
               <FieldLegend variant='label'>Color</FieldLegend>
               <div key={values.color} className='flex flex-wrap gap-3'>
                  {PROJECT_COLORS.map((color) => (
                     <label key={color.value} className='cursor-pointer'>
                        <input
                           type='radio'
                           name='color'
                           value={color.value}
                           defaultChecked={values.color === color.value}
                           aria-label={color.label}
                           className='peer sr-only'
                        />
                        <span
                           aria-hidden='true'
                           title={color.label}
                           className='block size-7 rounded-full ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring'
                           style={{ backgroundColor: color.value }}
                        />
                     </label>
                  ))}
               </div>
               <FieldError errors={toFieldErrors(errors?.color)} />
            </FieldSet>

            {state?.error && (
               <Alert variant='destructive'>
                  <AlertDescription>{state.error}</AlertDescription>
               </Alert>
            )}

            <div className='flex gap-2'>
               <Button type='submit' disabled={pending}>
                  {pending ? 'Saving…' : submitLabel}
               </Button>
               <Link href={cancelHref} className={cn(buttonVariants({ variant: 'outline' }))}>
                  Cancel
               </Link>
            </div>
         </FieldGroup>
      </form>
   );
}
