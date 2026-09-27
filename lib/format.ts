import { tz } from '@date-fns/tz';
import { format, formatDistanceStrict } from 'date-fns';

// Display helpers shared by pages. Times are shown in the user's time zone (lib/time-zone.ts),
// passed in by the Server Component that renders them, so server and browser agree. Without a
// zone, date-fns uses the server's own zone.

/** date-fns `format` in `timeZone` (via the `in` context option, date-fns 4). */
function formatIn(date: Date, pattern: string, timeZone?: string) {
   return format(date, pattern, timeZone ? { in: tz(timeZone) } : undefined);
}

/** -> "Sep 27, 2026" */
export function formatDate(date: Date, timeZone?: string) {
   return formatIn(date, 'MMM d, yyyy', timeZone);
}

/** -> "09:05" (24-hour clock) */
export function formatTime(date: Date, timeZone?: string) {
   return formatIn(date, 'HH:mm', timeZone);
}

/** -> "2026-09-27": the calendar day in that time zone, for grouping entries by day. */
export function dayKey(date: Date, timeZone?: string) {
   return formatIn(date, 'yyyy-MM-dd', timeZone);
}

/** -> "Mon, Sep 22" */
export function formatWeekday(date: Date, timeZone?: string) {
   return formatIn(date, 'EEE, MMM d', timeZone);
}

/** 3725 -> "1:02" (hours:minutes), or "1:02:05" with seconds (the running timer). */
export function formatDuration(totalSeconds: number, { seconds = false } = {}) {
   const s = Math.max(0, Math.floor(totalSeconds));
   const hours = Math.floor(s / 3600);
   const minutes = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
   const rest = String(s % 60).padStart(2, '0');
   return seconds ? `${hours}:${minutes}:${rest}` : `${hours}:${minutes}`;
}

/** -> "in 2 days" / "3 hours ago": how far `date` is from `now` (pass requestNow()). */
export function formatRelative(date: Date, now: number) {
   return formatDistanceStrict(date, now, { addSuffix: true });
}
