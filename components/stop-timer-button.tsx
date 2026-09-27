'use client';

import { useTransition } from 'react';
import { Square } from 'lucide-react';
import { toast } from 'sonner';
import { stopTimerAction } from '@/app/(app)/[orgSlug]/time/actions';
import { Button } from '@/components/ui/button';

// Stops the signed-in user's running timer (header and Time page). The action calls refresh(),
// so the header and the page both update.
export function StopTimerButton({ compact = false }: { compact?: boolean }) {
   const [pending, startTransition] = useTransition();

   function stop() {
      startTransition(async () => {
         const result = await stopTimerAction();
         if (result.ok) toast.success('Timer stopped.');
         else toast.error(result.message);
      });
   }

   return compact ? (
      <Button
         variant='outline'
         size='icon-sm'
         onClick={stop}
         disabled={pending}
         aria-label='Stop timer'
      >
         <Square className='fill-current' aria-hidden='true' />
      </Button>
   ) : (
      <Button variant='destructive' onClick={stop} disabled={pending}>
         <Square className='fill-current' aria-hidden='true' />
         {pending ? 'Stopping…' : 'Stop'}
      </Button>
   );
}
