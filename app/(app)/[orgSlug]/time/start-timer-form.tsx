'use client';

import { useActionState } from 'react';
import { Play } from 'lucide-react';
import { toFieldErrors } from '@/app/(auth)/_components/to-field-errors';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
   Select,
   SelectContent,
   SelectGroup,
   SelectItem,
   SelectLabel,
   SelectTrigger,
   SelectValue
} from '@/components/ui/select';
import type { StartTimerState } from './actions';

type StartTimerAction = (state: StartTimerState, formData: FormData) => Promise<StartTimerState>;
type ClientGroup = { client: string; projects: { value: string; label: string }[] };

// "What are you working on?" + project + billable + Start. On success the page re-renders with
// the running timer instead of this form.
export function StartTimerForm({
   action,
   groups,
   note
}: {
   action: StartTimerAction;
   groups: ClientGroup[];
   note?: string;
}) {
   const [state, formAction, pending] = useActionState(action, undefined);
   const errors = state?.fieldErrors;
   const values = state?.values;
   // Select shows the label of the chosen value; items is the flat list of all projects.
   const items = groups.flatMap((group) => group.projects);

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
               <Select
                  key={values?.projectId}
                  name='projectId'
                  items={items}
                  defaultValue={values?.projectId || null}
               >
                  <SelectTrigger
                     id='projectId'
                     className='w-full'
                     aria-invalid={!!errors?.projectId}
                  >
                     <SelectValue placeholder='Choose a project' />
                  </SelectTrigger>
                  <SelectContent>
                     {groups.map((group) => (
                        <SelectGroup key={group.client}>
                           <SelectLabel>{group.client}</SelectLabel>
                           {group.projects.map((project) => (
                              <SelectItem key={project.value} value={project.value}>
                                 {project.label}
                              </SelectItem>
                           ))}
                        </SelectGroup>
                     ))}
                  </SelectContent>
               </Select>
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
