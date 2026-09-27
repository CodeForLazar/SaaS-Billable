'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { CircleCheck } from 'lucide-react';
import { toFieldErrors } from '@/app/(auth)/_components/to-field-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { EntryFormState, EntryValues } from './actions';
import type { ProjectGroup } from './group-projects';
import { ProjectSelect } from './project-select';

type EntryAction = (state: EntryFormState, formData: FormData) => Promise<EntryFormState>;

// A time entry typed in by hand: what, which project, which day, from–to. Used on the Time page
// ("Add time" tab, stays there and clears after saving) and on the edit page (Cancel goes back).
export function EntryForm({
   action,
   groups,
   defaultValues,
   submitLabel,
   cancelHref
}: {
   action: EntryAction;
   groups: ProjectGroup[];
   defaultValues: EntryValues;
   submitLabel: string;
   cancelHref?: string;
}) {
   const [state, formAction, pending] = useActionState(action, undefined);
   const errors = state?.fieldErrors;
   // After a failed save, show what was typed (React resets the form when an action finishes).
   const values = state?.values ?? defaultValues;

   return (
      <form action={formAction} noValidate className='flex flex-col gap-4'>
         <Field data-invalid={!!errors?.description}>
            <FieldLabel htmlFor='entry-description'>What did you work on?</FieldLabel>
            <Input
               key={values.description}
               id='entry-description'
               name='description'
               placeholder='e.g. Client call about the homepage'
               autoComplete='off'
               defaultValue={values.description}
               aria-invalid={!!errors?.description}
            />
            <FieldError errors={toFieldErrors(errors?.description)} />
         </Field>

         <div className='grid gap-4 sm:grid-cols-[1fr_10rem_7rem_7rem] sm:items-start'>
            <Field data-invalid={!!errors?.projectId}>
               <FieldLabel htmlFor='projectId'>Project</FieldLabel>
               <ProjectSelect
                  groups={groups}
                  defaultValue={values.projectId}
                  invalid={!!errors?.projectId}
               />
               <FieldError errors={toFieldErrors(errors?.projectId)} />
            </Field>
            <Field data-invalid={!!errors?.date}>
               <FieldLabel htmlFor='date'>Date</FieldLabel>
               <Input
                  key={values.date}
                  id='date'
                  name='date'
                  type='date'
                  defaultValue={values.date}
                  aria-invalid={!!errors?.date}
               />
               <FieldError errors={toFieldErrors(errors?.date)} />
            </Field>
            <Field data-invalid={!!errors?.start}>
               <FieldLabel htmlFor='start'>From</FieldLabel>
               <Input
                  key={values.start}
                  id='start'
                  name='start'
                  type='time'
                  defaultValue={values.start}
                  aria-invalid={!!errors?.start}
               />
               <FieldError errors={toFieldErrors(errors?.start)} />
            </Field>
            <Field data-invalid={!!errors?.end}>
               <FieldLabel htmlFor='end'>To</FieldLabel>
               <Input
                  key={values.end}
                  id='end'
                  name='end'
                  type='time'
                  defaultValue={values.end}
                  aria-invalid={!!errors?.end}
               />
               <FieldError errors={toFieldErrors(errors?.end)} />
            </Field>
         </div>

         <Field orientation='horizontal'>
            <Checkbox
               key={values.billable}
               id='entry-billable'
               name='billable'
               defaultChecked={values.billable === 'on'}
            />
            <FieldLabel htmlFor='entry-billable' className='font-normal'>
               Billable
            </FieldLabel>
         </Field>

         {state?.error && (
            <Alert variant='destructive'>
               <AlertDescription>{state.error}</AlertDescription>
            </Alert>
         )}
         {state?.added && (
            <Alert>
               <CircleCheck />
               <AlertDescription>Time added. It&apos;s in the list below.</AlertDescription>
            </Alert>
         )}

         <div className='flex gap-2'>
            <Button type='submit' disabled={pending}>
               {pending ? 'Saving…' : submitLabel}
            </Button>
            {cancelHref && (
               <Link href={cancelHref} className={cn(buttonVariants({ variant: 'outline' }))}>
                  Cancel
               </Link>
            )}
         </div>
      </form>
   );
}
