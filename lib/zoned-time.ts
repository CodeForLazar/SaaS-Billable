import { TZDate, tzOffset } from '@date-fns/tz';
import { format } from 'date-fns';

// Converting between a wall-clock date/time in some time zone ("2026-09-26" "09:00" in
// Europe/Skopje) and a UTC instant.
//
// Around daylight-saving changes: a time that doesn't exist (the skipped spring hour) moves
// forward by the gap, and a time that exists twice (autumn) resolves to the first one.
//
// zonedToUtc works with the zone's offsets directly (tzOffset) instead of building a TZDate from
// the date parts: that resolves the repeated autumn hour differently depending on the time zone
// of the machine it runs on (found by CI, which runs in UTC like Vercel).

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

/** "2026-09-26" + "09:00" in `timeZone` -> the UTC instant. Inputs must be valid (YYYY-MM-DD, HH:MM). */
export function zonedToUtc(date: string, time: string, timeZone: string) {
   const [year, month, day] = date.split('-').map(Number);
   const [hour, minute] = time.split(':').map(Number);
   // The wall-clock time as if it were UTC; the real instant is this minus the zone's offset.
   const wall = Date.UTC(year, month - 1, day, hour, minute);
   // The zone's offsets (in minutes) a day before and a day after: they differ only when the
   // clocks change in between.
   const before = tzOffset(timeZone, new Date(wall - DAY));
   const after = tzOffset(timeZone, new Date(wall + DAY));
   // An offset fits if the zone really has that offset at the resulting instant.
   const fits = [before, after]
      .map((offset) => wall - offset * MINUTE)
      .filter((instant, i) => tzOffset(timeZone, new Date(instant)) === [before, after][i]);
   // One fit: a normal time. Two: the repeated autumn hour, take the first (earlier) one.
   // None: the skipped spring hour; the offset from before the change moves it forward.
   return new Date(fits.length > 0 ? Math.min(...fits) : wall - before * MINUTE);
}

/** The UTC instant as { date: "2026-09-26", time: "09:00" } on a clock in `timeZone` (for forms). */
export function utcToZoned(instant: Date, timeZone: string) {
   const local = new TZDate(instant.getTime(), timeZone);
   return { date: format(local, 'yyyy-MM-dd'), time: format(local, 'HH:mm') };
}
