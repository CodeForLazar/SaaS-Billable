'use client';

import { useActionState } from 'react';
import { type DemoState, startDemoAction } from '@/app/(marketing)/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// "Try the demo": starts a fresh demo workspace for this visitor. The browser knows the
// visitor's time zone, so it's added to the form before the Server Action runs; the demo's
// working hours then fall on the visitor's own clock.
export function DemoButton({
   children = 'Try the demo',
   variant = 'default',
   size = 'lg',
   className,
   formClassName
}: {
   children?: React.ReactNode;
   variant?: 'default' | 'outline' | 'secondary';
   size?: 'default' | 'lg';
   className?: string;
   /** Classes for the wrapping form (e.g. full width on phones). */
   formClassName?: string;
}) {
   const [state, formAction, pending] = useActionState((prev: DemoState, formData: FormData) => {
      formData.set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone);
      return startDemoAction(prev, formData);
   }, undefined);

   return (
      <form action={formAction} className={cn('flex flex-col items-center gap-2', formClassName)}>
         <Button
            type='submit'
            variant={variant}
            size={size}
            disabled={pending}
            className={cn(className)}
         >
            {pending ? 'Setting up your demo…' : children}
         </Button>
         {state?.error && (
            <p role='alert' className='text-sm text-destructive'>
               {state.error}
            </p>
         )}
      </form>
   );
}
