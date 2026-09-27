import { FlaskConical } from 'lucide-react';
import { leaveDemoAction } from '@/app/(marketing)/actions';
import { formatRelative } from '@/lib/format';

// Shown at the top of every page of a demo workspace: what this is, when it goes away, and the
// way out to a real account.
export function DemoBanner({ expiresAt, now }: { expiresAt: Date; now: number }) {
   return (
      <div className='flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-primary px-4 py-2 text-center text-sm text-primary-foreground'>
         <span className='flex items-center gap-2'>
            <FlaskConical className='size-4 shrink-0' aria-hidden='true' />
            <span>
               <strong className='font-semibold'>Demo workspace.</strong> Try anything: it&apos;s
               yours alone and is deleted {formatRelative(expiresAt, now)}. Emails aren&apos;t sent.
            </span>
         </span>
         <form action={leaveDemoAction}>
            <button type='submit' className='font-medium underline underline-offset-4'>
               Create your own account
            </button>
         </form>
      </div>
   );
}
