import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';

// Converting between a wall-clock date/time in some time zone ("2026-09-26" "09:00" in
// Europe/Skopje) and a UTC instant. TZDate (@date-fns/tz) is a Date whose fields (year, hours...)
// are read and set in a given zone, so it does the offset and daylight-saving maths for us.
//
// Around daylight-saving changes: a time that doesn't exist (the skipped spring hour) moves
// forward by the gap, and a time that exists twice (autumn) resolves to the first one.

/** "2026-09-26" + "09:00" in `timeZone` -> the UTC instant. Inputs must be valid (YYYY-MM-DD, HH:MM). */
export function zonedToUtc(date: string, time: string, timeZone: string) {
   const [year, month, day] = date.split('-').map(Number);
   const [hour, minute] = time.split(':').map(Number);
   // A plain Date for Prisma; the TZDate was only needed to interpret the wall time.
   return new Date(new TZDate(year, month - 1, day, hour, minute, timeZone).getTime());
}

/** The UTC instant as { date: "2026-09-26", time: "09:00" } on a clock in `timeZone` (for forms). */
export function utcToZoned(instant: Date, timeZone: string) {
   const local = new TZDate(instant.getTime(), timeZone);
   return { date: format(local, 'yyyy-MM-dd'), time: format(local, 'HH:mm') };
}
