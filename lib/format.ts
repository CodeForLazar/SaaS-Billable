// Display helpers shared by pages. Times are shown in the user's time zone (lib/time-zone.ts),
// passed in by the Server Component that renders them, so server and browser agree.

/** 27 Sep 2026 -> "Sep 27, 2026" */
export function formatDate(date: Date, timeZone?: string) {
   return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone }).format(date);
}

/** -> "09:05" (24-hour clock) */
export function formatTime(date: Date, timeZone?: string) {
   return new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone }).format(date);
}

/** -> "2026-09-27": the calendar day in that time zone, for grouping entries by day. */
export function dayKey(date: Date, timeZone?: string) {
   return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone
   }).format(date);
}

/** -> "Mon, Sep 22" */
export function formatWeekday(date: Date, timeZone?: string) {
   return new Intl.DateTimeFormat('en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone
   }).format(date);
}

/** 3725 -> "1:02" (hours:minutes), or "1:02:05" with seconds (the running timer). */
export function formatDuration(totalSeconds: number, { seconds = false } = {}) {
   const s = Math.max(0, Math.floor(totalSeconds));
   const hours = Math.floor(s / 3600);
   const minutes = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
   const rest = String(s % 60).padStart(2, '0');
   return seconds ? `${hours}:${minutes}:${rest}` : `${hours}:${minutes}`;
}
