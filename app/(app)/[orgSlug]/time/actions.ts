'use server';

import { refresh } from 'next/cache';
import { z } from 'zod';
import { startTimerSchema } from '@/lib/validations/time-entry';
import { type TimerResult, startTimer, stopTimer } from '@/server/time-entries';

const FIELDS = ['projectId', 'description', 'billable'] as const;
type TimerField = (typeof FIELDS)[number];

export type StartTimerState =
   | {
        error?: string;
        fieldErrors?: Partial<Record<TimerField, string[]>>;
        values?: Record<TimerField, string>;
     }
   | undefined;

// orgSlug is bound by the page; the service checks the membership (and that the project is an
// active project of this workspace).
export async function startTimerAction(
   orgSlug: string,
   _prevState: StartTimerState,
   formData: FormData
): Promise<StartTimerState> {
   const values = Object.fromEntries(
      FIELDS.map((field) => {
         const value = formData.get(field);
         return [field, typeof value === 'string' ? value : ''];
      })
   ) as Record<TimerField, string>;

   const parsed = startTimerSchema.safeParse(values);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }

   const result = await startTimer(orgSlug, parsed.data);
   if (!result.ok) {
      return result.field
         ? { fieldErrors: { [result.field]: [result.message] }, values }
         : { error: result.message, values };
   }

   // Re-render the page AND the layout (the header shows the running timer).
   refresh();
   return undefined;
}

// From the header's Stop button (any workspace page) and the Time page. No arguments: it stops
// the signed-in user's own running timer.
export async function stopTimerAction(): Promise<TimerResult> {
   const result = await stopTimer();
   if (result.ok) refresh();
   return result;
}
