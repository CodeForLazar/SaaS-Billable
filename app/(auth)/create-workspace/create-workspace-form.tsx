'use client';

import { useActionState, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { slugify } from '@/lib/slug';
import { toFieldErrors } from '../_components/to-field-errors';
import { createWorkspace } from './actions';

export function CreateWorkspaceForm() {
   const [state, formAction, pending] = useActionState(createWorkspace, undefined);
   const errors = state?.fieldErrors;

   // Controlled inputs: the URL follows the name as you type, until you edit the URL yourself.
   const [name, setName] = useState('');
   const [slug, setSlug] = useState('');
   const [slugEdited, setSlugEdited] = useState(false);

   return (
      <form action={formAction} noValidate>
         <FieldGroup>
            <Field data-invalid={!!errors?.name}>
               <FieldLabel htmlFor='name'>Workspace name</FieldLabel>
               <Input
                  id='name'
                  name='name'
                  placeholder='Acme Design'
                  autoComplete='organization'
                  value={name}
                  onChange={(event) => {
                     setName(event.target.value);
                     if (!slugEdited) setSlug(slugify(event.target.value));
                  }}
                  aria-invalid={!!errors?.name}
               />
               <FieldDescription>Usually your business or studio name.</FieldDescription>
               <FieldError errors={toFieldErrors(errors?.name)} />
            </Field>

            <Field data-invalid={!!errors?.slug}>
               <FieldLabel htmlFor='slug'>Workspace URL</FieldLabel>
               <Input
                  id='slug'
                  name='slug'
                  placeholder='acme-design'
                  autoCapitalize='none'
                  spellCheck={false}
                  value={slug}
                  onChange={(event) => {
                     setSlug(event.target.value.toLowerCase());
                     setSlugEdited(true);
                  }}
                  aria-invalid={!!errors?.slug}
               />
               <FieldDescription>
                  Your workspace will live at{' '}
                  <span className='font-medium text-foreground'>/{slug || 'your-url'}</span>
               </FieldDescription>
               <FieldError errors={toFieldErrors(errors?.slug)} />
            </Field>

            {state?.error && (
               <Alert variant='destructive'>
                  <AlertDescription>{state.error}</AlertDescription>
               </Alert>
            )}

            <Button type='submit' disabled={pending}>
               {pending ? 'Creating workspace…' : 'Create workspace'}
            </Button>
         </FieldGroup>
      </form>
   );
}
