import { describe, expect, it } from 'vitest';
import { utcToZoned, zonedToUtc } from '@/lib/zoned-time';

// A manual time entry is typed on the user's clock ("09:00" in their zone) and stored in UTC.
// Offsets change with daylight saving, and some wall-clock times don't exist (the skipped spring
// hour) or exist twice (autumn): these are the cases that break hand-written offset maths.
describe('zonedToUtc', () => {
   it.each([
      ['summer time (+2)', '2026-09-26', '09:00', 'Europe/Skopje', '2026-09-26T07:00:00.000Z'],
      ['winter time (+1)', '2026-01-15', '09:00', 'Europe/Skopje', '2026-01-15T08:00:00.000Z'],
      ['New York (-4)', '2026-09-26', '09:00', 'America/New_York', '2026-09-26T13:00:00.000Z'],
      ['UTC', '2026-09-26', '23:30', 'UTC', '2026-09-26T23:30:00.000Z'],
      [
         'a half-hour zone (+5:30)',
         '2026-09-26',
         '09:00',
         'Asia/Kolkata',
         '2026-09-26T03:30:00.000Z'
      ],
      [
         'the day before in UTC (+12)',
         '2026-09-26',
         '00:15',
         'Pacific/Auckland',
         '2026-09-25T12:15:00.000Z'
      ],
      // 02:30 doesn't exist on these days: it moves forward by the gap (03:30 local).
      ['skipped hour (Europe)', '2026-03-29', '02:30', 'Europe/Skopje', '2026-03-29T01:30:00.000Z'],
      ['skipped hour (US)', '2026-03-08', '02:30', 'America/New_York', '2026-03-08T07:30:00.000Z'],
      // 02:30 happens twice: the first one (still summer time) is used.
      ['repeated hour (Europe)', '2026-10-25', '02:30', 'Europe/Skopje', '2026-10-25T00:30:00.000Z']
   ])('%s: %s %s in %s', (_label, date, time, timeZone, expected) => {
      expect(zonedToUtc(date, time, timeZone).toISOString()).toBe(expected);
   });

   it('returns a plain Date (what Prisma expects)', () => {
      expect(zonedToUtc('2026-09-26', '09:00', 'Europe/Skopje').constructor).toBe(Date);
   });
});

describe('utcToZoned', () => {
   it('shows an instant on the user’s clock', () => {
      const instant = new Date('2026-09-26T13:00:00.000Z');
      expect(utcToZoned(instant, 'America/New_York')).toEqual({
         date: '2026-09-26',
         time: '09:00'
      });
      expect(utcToZoned(instant, 'Asia/Tokyo')).toEqual({ date: '2026-09-26', time: '22:00' });
   });

   it('moves to the next calendar day when the zone is ahead', () => {
      const instant = new Date('2026-09-26T23:30:00.000Z');
      expect(utcToZoned(instant, 'Europe/Skopje')).toEqual({ date: '2026-09-27', time: '01:30' });
   });

   it('round-trips with zonedToUtc for normal times', () => {
      for (const timeZone of ['Europe/Skopje', 'America/New_York', 'Asia/Kolkata']) {
         expect(utcToZoned(zonedToUtc('2026-11-02', '17:45', timeZone), timeZone)).toEqual({
            date: '2026-11-02',
            time: '17:45'
         });
      }
   });
});
