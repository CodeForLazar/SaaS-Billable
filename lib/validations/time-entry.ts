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
