import { describe, expect, it } from 'vitest';
import { isCalendarDate, timeEntrySchema, weekQuerySchema } from '@/validations/time-entry';

describe('isCalendarDate', () => {
   it('accepts real days, including leap days', () => {
      expect(isCalendarDate('2026-09-26')).toBe(true);
      expect(isCalendarDate('2028-02-29')).toBe(true);
   });

   it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-9-3', '26-09-26', '1999-12-31', ''])(
      'rejects "%s"',
      (value) => {
         expect(isCalendarDate(value)).toBe(false);
      }
   );
});

describe('timeEntrySchema', () => {
   const entry = {
      projectId: 'p1',
      description: '  Homepage  ',
      billable: 'on',
      date: '2026-09-26',
      start: '09:00',
      end: '10:30'
   };

   it('parses a form submission', () => {
      expect(timeEntrySchema.parse(entry)).toEqual({
         ...entry,
         description: 'Homepage',
         billable: true
      });
   });

   it('reads an unticked checkbox and an empty description', () => {
      const parsed = timeEntrySchema.parse({ ...entry, billable: '', description: ' ' });
      expect(parsed.billable).toBe(false);
      expect(parsed.description).toBeNull();
   });

   it('rejects an end at or before the start (entries cannot cross midnight)', () => {
      for (const end of ['09:00', '08:59']) {
         const result = timeEntrySchema.safeParse({ ...entry, end });
         expect(result.success).toBe(false);
         expect(result.error?.issues[0].path).toEqual(['end']);
      }
   });

   it.each(['24:00', '9:00', '09:60', '0900'])('rejects the time "%s"', (start) => {
      expect(timeEntrySchema.safeParse({ ...entry, start }).success).toBe(false);
   });
});

describe('weekQuerySchema', () => {
   it('keeps a valid day and turns junk into "this week"', () => {
      expect(weekQuerySchema.parse({ week: '2026-09-24' })).toEqual({ week: '2026-09-24' });
      expect(weekQuerySchema.parse({ week: 'abc' })).toEqual({ week: undefined });
      expect(weekQuerySchema.parse({ week: '2026-02-30' })).toEqual({ week: undefined });
      expect(weekQuerySchema.parse({})).toEqual({ week: undefined });
   });
});
