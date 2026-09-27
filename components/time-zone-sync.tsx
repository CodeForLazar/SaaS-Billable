'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Tells the server the browser's time zone (see lib/time-zone.ts). `current` is what the server
// received. If it's missing or outdated (first visit, travelling), store the new one and re-render
// the page on the server once, so times are shown in the right zone.
export function TimeZoneSync({ current }: { current: string | undefined }) {
   const router = useRouter();

   useEffect(() => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!timeZone || timeZone === current) return;
      document.cookie = `tz=${encodeURIComponent(timeZone)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
   }, [current, router]);

   return null;
}
