'use client';

import { useActionState } from 'react';
import { Play } from 'lucide-react';
import { toFieldErrors } from '@/app/(auth)/_components/to-field-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { StartTimerState } from './actions';
import type { ProjectGroup } from './group-projects';
import { ProjectSelect } from './project-select';

type StartTimerAction = (state: StartTimerState, formData: FormData) => Promise<StartTimerState>;

// "What are you working on?" + project + billable + Start. On success the page re-renders with
// the running timer instead of this form.
export function StartTimerForm({
   action,
   groups,
   note
}: {
   action: StartTimerAction;
   groups: ProjectGroup[];
   note?: string;
}) {
   const [state, formAction, pending] = useActionState(action, undefined);
   const errors = state?.fieldErrors;
   const values = state?.values;

   return (
      <form action={formAction} noValidate className='flex flex-col gap-4'>
         <div className='grid gap-4 sm:grid-cols-[1fr_16rem_auto] sm:items-start'>
            <Field data-invalid={!!errors?.description}>
               <FieldLabel htmlFor='description'>What are you working on?</FieldLabel>
               <Input
                  key={values?.description}
                  id='description'
                  name='description'
                  placeholder='e.g. Homepage wireframes'
                  autoComplete='off'
                  defaultValue={values?.description}
                  aria-invalid={!!errors?.description}
               />
               <FieldError errors={toFieldErrors(errors?.description)} />
            </Field>
            <Field data-invalid={!!errors?.projectId}>
               <FieldLabel htmlFor='projectId'>Project</FieldLabel>
               <ProjectSelect
                  groups={groups}
                  defaultValue={values?.projectId}
                  invalid={!!errors?.projectId}
               />
               <FieldError errors={toFieldErrors(errors?.projectId)} />
            </Field>
            {/* sm:mt-6 lines the button up with the inputs, below their labels */}
            <Button type='submit' disabled={pending} className='sm:mt-6'>
               <Play aria-hidden='true' />
               {pending ? 'Starting…' : 'Start'}
            </Button>
         </div>

         <Field orientation='horizontal'>
            <Checkbox
               key={values?.billable}
               id='billable'
               name='billable'
               defaultChecked={values ? values.billable === 'on' : true}
            />
            <FieldLabel htmlFor='billable' className='font-normal'>
               Billable
            </FieldLabel>
         </Field>

         {note && <p className='text-sm text-muted-foreground'>{note}</p>}
         {state?.error && (
            <Alert variant='destructive'>
               <AlertDescription>{state.error}</AlertDescription>
            </Alert>
         )}
      </form>
   );
}
