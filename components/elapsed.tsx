'use client';

import { useSyncExternalStore } from 'react';
import { formatDuration } from '@/lib/format';

// A clock that ticks once a second, shared by every <Elapsed> on the page.
function subscribe(onTick: () => void) {
   const id = setInterval(onTick, 1000);
   return () => clearInterval(id);
}
const nowInSeconds = () => Math.floor(Date.now() / 1000);

/**
 * "1:02:05" since `startedAt`, updated every second.
 *
 * `renderedAt` is the server's clock when it rendered the page. During hydration React uses it
 * (getServerSnapshot), so the first browser render matches the server's HTML exactly, and then
 * switches to the live clock. Without it the two would differ by a second or so and React would
 * warn about a hydration mismatch.
 */
export function Elapsed({ startedAt, renderedAt }: { startedAt: Date; renderedAt: number }) {
   const now = useSyncExternalStore(subscribe, nowInSeconds, () => Math.floor(renderedAt / 1000));
   const seconds = now - Math.floor(startedAt.getTime() / 1000);
   return (
      <time className='tabular-nums' dateTime={`PT${Math.max(0, seconds)}S`}>
         {formatDuration(seconds, { seconds: true })}
      </time>
   );
}
