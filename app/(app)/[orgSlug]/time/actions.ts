'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getTimeZone } from '@/lib/time-zone';
import { startTimerSchema, timeEntrySchema } from '@/lib/validations/time-entry';
import {
   type TimerResult,
   createTimeEntry,
   deleteTimeEntry,
   startTimer,
   stopTimer,
   updateTimeEntry
} from '@/server/time-entries';

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

// --- Adding and editing entries by hand ---------------------------------------------------------

const ENTRY_FIELDS = ['projectId', 'description', 'billable', 'date', 'start', 'end'] as const;
type EntryField = (typeof ENTRY_FIELDS)[number];
export type EntryValues = Record<EntryField, string>;

export type EntryFormState =
   | {
        error?: string;
        fieldErrors?: Partial<Record<EntryField, string[]>>;
        values?: EntryValues;
        added?: boolean;
     }
   | undefined;

function readEntryFields(formData: FormData) {
   return Object.fromEntries(
      ENTRY_FIELDS.map((field) => {
         const value = formData.get(field);
         return [field, typeof value === 'string' ? value : ''];
      })
   ) as EntryValues;
}

type Save = (input: z.infer<typeof timeEntrySchema>, timeZone: string) => Promise<TimerResult>;

// Validate, save, and turn the result into form state. The date and times are on the user's
// clock, so the service gets their time zone to convert them to UTC.
async function saveEntry(formData: FormData, save: Save) {
   const values = readEntryFields(formData);
   const parsed = timeEntrySchema.safeParse(values);
   if (!parsed.success) {
      return { state: { fieldErrors: z.flattenError(parsed.error).fieldErrors, values } };
   }
   const result = await save(parsed.data, await getTimeZone());
   if (!result.ok) {
      return {
         state: result.field
            ? { fieldErrors: { [result.field]: [result.message] }, values }
            : { error: result.message, values }
      };
   }
   return { ok: true as const };
}

export async function createTimeEntryAction(
   orgSlug: string,
   _prevState: EntryFormState,
   formData: FormData
): Promise<EntryFormState> {
   const saved = await saveEntry(formData, (input, timeZone) =>
      createTimeEntry(orgSlug, input, timeZone)
   );
   if (!saved.ok) return saved.state;
   refresh(); // the new entry shows up in the list below the form
   return { added: true };
}

export async function updateTimeEntryAction(
   orgSlug: string,
   entryId: string,
   _prevState: EntryFormState,
   formData: FormData
): Promise<EntryFormState> {
   if (!z.string().min(1).max(100).safeParse(entryId).success) return { error: 'Invalid request.' };
   const saved = await saveEntry(formData, (input, timeZone) =>
      updateTimeEntry(orgSlug, entryId, input, timeZone)
   );
   if (!saved.ok) return saved.state;
   // Safe to build from the bound orgSlug: we only get here after requireMembership() accepted it,
   // so it's a real workspace slug (a-z, 0-9, dashes), never something like "//evil.example".
   redirect(`/${orgSlug}/time`);
}

// From the entry's "⋯" menu (click handler, plain arguments).
export async function deleteTimeEntryAction(
   orgSlug: string,
   entryId: string
): Promise<TimerResult> {
   if (!z.string().min(1).max(100).safeParse(entryId).success) {
      return { ok: false, message: 'Invalid request.' };
   }
   const result = await deleteTimeEntry(orgSlug, entryId);
   if (result.ok) refresh();
   return result;
}
