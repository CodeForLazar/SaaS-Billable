import { describe, expect, it } from 'vitest';
import { dayKey, formatDayRange, formatDuration, formatRelative, formatTime } from '@/lib/format';

describe('dayKey and formatTime (the user’s calendar and clock)', () => {
   // 01:30 UTC on Sep 20 is still the evening of Sep 19 in New York.
   const instant = new Date('2026-09-20T01:30:00.000Z');

   it('puts an instant on the right day in each zone', () => {
      expect(dayKey(instant, 'UTC')).toBe('2026-09-20');
      expect(dayKey(instant, 'America/New_York')).toBe('2026-09-19');
      expect(dayKey(instant, 'Asia/Tokyo')).toBe('2026-09-20');
   });

   it('shows the time on each clock', () => {
      expect(formatTime(instant, 'America/New_York')).toBe('21:30');
      expect(formatTime(instant, 'Asia/Kolkata')).toBe('07:00');
   });
});

describe('formatDayRange', () => {
   const utc = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

   it('shows one day once', () => {
      expect(formatDayRange(utc('2026-09-21'), utc('2026-09-21'), 'UTC')).toBe('Sep 21, 2026');
   });

   it('shortens ranges within a month and within a year', () => {
      expect(formatDayRange(utc('2026-09-21'), utc('2026-09-27'), 'UTC')).toBe('Sep 21 – 27, 2026');
      expect(formatDayRange(utc('2026-09-28'), utc('2026-10-04'), 'UTC')).toBe(
         'Sep 28 – Oct 4, 2026'
      );
   });

   it('shows both years when the range crosses New Year', () => {
      expect(formatDayRange(utc('2026-12-28'), utc('2027-01-03'), 'UTC')).toBe(
         'Dec 28, 2026 – Jan 3, 2027'
      );
   });
});

describe('formatDuration', () => {
   it('shows hours:minutes', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(3725)).toBe('1:02');
      expect(formatDuration(36_000)).toBe('10:00');
      expect(formatDuration(1_000_000)).toBe('277:46'); // no day rollover in totals
   });

   it('can include seconds (the running timer)', () => {
      expect(formatDuration(3725, { seconds: true })).toBe('1:02:05');
   });

   it('treats negative and fractional input safely', () => {
      expect(formatDuration(-5)).toBe('0:00');
      expect(formatDuration(59.9)).toBe('0:00');
   });
});

describe('formatRelative', () => {
   it('says how far away a date is', () => {
      const now = Date.parse('2026-09-27T12:00:00.000Z');
      expect(formatRelative(new Date('2026-09-29T11:00:00.000Z'), now)).toBe('in 2 days');
      expect(formatRelative(new Date('2026-09-27T09:00:00.000Z'), now)).toBe('3 hours ago');
   });
});
