import { z } from 'zod';

// Starting a timer. `billable` comes from a checkbox: "on" when ticked, missing (read as "")
// when not.
export const startTimerSchema = z.object({
   projectId: z.string().trim().min(1, 'Choose a project').max(100, 'Choose a project'),
   description: z
      .string()
      .trim()
      .max(500, 'Must be at most 500 characters')
      .transform((value) => value || null),
   billable: z.string().transform((value) => value === 'on')
});

export type StartTimerInput = z.infer<typeof startTimerSchema>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/; // "09:05", 24-hour, what <input type="time"> sends

/** "2026-09-26" that is a real calendar day (not 2026-02-30) in a sane range. */
export function isCalendarDate(value: string) {
   if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
   const [year, month, day] = value.split('-').map(Number);
   const date = new Date(Date.UTC(year, month - 1, day));
   return (
      year >= 2000 && year <= 2100 && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
   );
}

// Adding or editing an entry by hand: a day plus start and end times on that day, in the user's
// time zone (the server converts them to UTC). Entries can't cross midnight: split them in two.
export const timeEntrySchema = z
   .object({
      projectId: startTimerSchema.shape.projectId,
      description: startTimerSchema.shape.description,
      billable: startTimerSchema.shape.billable,
      date: z.string().trim().refine(isCalendarDate, 'Enter a valid date'),
      start: z.string().trim().regex(TIME, 'Enter a time like 09:00'),
      end: z.string().trim().regex(TIME, 'Enter a time like 17:30')
   })
   // "HH:MM" strings compare correctly as text
   .refine((entry) => !TIME.test(entry.start) || !TIME.test(entry.end) || entry.end > entry.start, {
      path: ['end'],
      message: 'End time must be after the start time'
   });

export type TimeEntryInput = z.infer<typeof timeEntrySchema>;

// ?week=2026-09-21 on the weekly timesheet: any day of the wanted week (the page moves it to
// Monday). From the URL, so junk falls back to "this week" instead of erroring.
export const weekQuerySchema = z.object({
   week: z.string().refine(isCalendarDate).optional().catch(undefined)
});
