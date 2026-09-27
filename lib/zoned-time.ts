// Converting between a wall-clock date/time in some time zone ("2026-09-26" "09:00" in
// Europe/Skopje) and a UTC instant, using only Intl (no date library).

/** The parts of `date` as a clock in `timeZone` shows them. */
function wallClock(date: Date, timeZone: string) {
   const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
   }).formatToParts(date);
   const get = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);
   return {
      year: get('year'),
      month: get('month'),
      day: get('day'),
      hour: get('hour'),
      minute: get('minute'),
      second: get('second')
   };
}

/** How far `timeZone` is ahead of UTC at that instant, in ms (Skopje in summer: +2 h). */
function offsetAt(date: Date, timeZone: string) {
   const c = wallClock(date, timeZone);
   const asUtc = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second);
   return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * "2026-09-26" + "09:00" in `timeZone` -> the UTC instant. Inputs must already be valid
 * (YYYY-MM-DD, HH:MM). Around daylight-saving changes: a time that doesn't exist (skipped hour)
 * moves forward by the gap, and a time that exists twice uses the first one, like most calendars.
 */
export function zonedToUtc(date: string, time: string, timeZone: string) {
   const [year, month, day] = date.split('-').map(Number);
   const [hour, minute] = time.split(':').map(Number);
   const wall = Date.UTC(year, month - 1, day, hour, minute);

   // The zone's offset can only be one of two values around this date: the one before a
   // daylight-saving change and the one after. Try both, and keep those whose clock reading really
   // is the wall time asked for.
   const oneDay = 24 * 60 * 60 * 1000;
   const before = wall - offsetAt(new Date(wall - oneDay), timeZone);
   const after = wall - offsetAt(new Date(wall + oneDay), timeZone);
   const matches = [before, after].filter(
      (candidate) => candidate + offsetAt(new Date(candidate), timeZone) === wall
   );
   // Both match: the hour repeats (autumn), take the first. None: the hour was skipped (spring),
   // `before` lands the same distance past the gap.
   return new Date(matches.length ? Math.min(...matches) : before);
}

/** The UTC instant as { date: "2026-09-26", time: "09:00" } on a clock in `timeZone` (for forms). */
export function utcToZoned(instant: Date, timeZone: string) {
   const c = wallClock(instant, timeZone);
   const pad = (n: number) => String(n).padStart(2, '0');
   return {
      date: `${c.year}-${pad(c.month)}-${pad(c.day)}`,
      time: `${pad(c.hour)}:${pad(c.minute)}`
   };
}
