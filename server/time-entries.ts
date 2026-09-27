import 'server-only';
import { TZDate } from '@date-fns/tz';
import { differenceInSeconds, startOfDay, subDays } from 'date-fns';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import type { StartTimerInput, TimeEntryInput } from '@/lib/validations/time-entry';
import { zonedToUtc } from '@/lib/zoned-time';
import { getSession } from '@/lib/session';
import { requireMembership } from '@/server/organizations';

// Time entries belong to a workspace AND a person. Everyone in a workspace tracks their own time;
// these functions only ever touch the signed-in user's entries.

export type TimerResult =
   { ok: true } | { ok: false; message: string; field?: 'projectId' | 'end' };

/** Fields that finish an entry: end now, duration in whole seconds. */
function finishAt(startedAt: Date, endedAt: Date) {
   return {
      endedAt,
      durationSec: Math.max(0, differenceInSeconds(endedAt, startedAt))
   };
}

/**
 * The signed-in user's running timer, in whichever workspace it runs (a user has at most one),
 * or null. Shown in the header of every workspace page.
 */
export async function getRunningTimer() {
   const session = await getSession();
   if (!session) return null;

   return db.timeEntry.findFirst({
      where: { userId: session.user.id, endedAt: null },
      select: {
         id: true,
         description: true,
         startedAt: true,
         project: { select: { name: true, color: true, client: { select: { name: true } } } },
         organization: { select: { name: true, slug: true } }
      }
   });
}

/**
 * Starts a timer on one of the workspace's active projects. A timer that is already running
 * (here or in another workspace) is stopped first, in the same transaction: starting something
 * new means you stopped working on the old thing.
 */
export async function startTimer(orgSlug: string, input: StartTimerInput): Promise<TimerResult> {
   const { session, organization } = await requireMembership(orgSlug);
   const userId = session.user.id;

   const project = await db.project.findFirst({
      where: { id: input.projectId, organizationId: organization.id, archivedAt: null },
      select: { id: true }
   });
   if (!project) {
      return { ok: false, field: 'projectId', message: 'Choose one of your active projects.' };
   }

   try {
      await db.$transaction(async (tx) => {
         const now = new Date();
         const running = await tx.timeEntry.findFirst({
            where: { userId, endedAt: null },
            select: { id: true, startedAt: true }
         });
         if (running) {
            await tx.timeEntry.update({
               where: { id: running.id },
               data: finishAt(running.startedAt, now)
            });
         }
         await tx.timeEntry.create({
            data: {
               organizationId: organization.id, // from the membership, not the form
               userId, // from the session
               projectId: project.id,
               description: input.description,
               billable: input.billable,
               startedAt: now
            }
         });
      });
   } catch (error) {
      // The partial unique index (one running timer per user) rejected a second timer: another
      // tab or device started one at the same moment.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
         return { ok: false, message: 'Another timer was just started. Refresh and try again.' };
      }
      throw error;
   }
   return { ok: true };
}

/**
 * Stops the signed-in user's running timer. No workspace argument on purpose: a user has at most
 * one timer, it's their own data, and they must be able to stop it from anywhere (even after
 * being removed from the workspace it runs in).
 */
export async function stopTimer(): Promise<TimerResult> {
   const session = await getSession();
   if (!session) redirect('/sign-in');

   const running = await db.timeEntry.findFirst({
      where: { userId: session.user.id, endedAt: null },
      select: { id: true, startedAt: true }
   });
   if (!running) return { ok: false, message: 'No timer is running.' };

   // "endedAt: null" in the filter: if two tabs stop at once, only the first one writes.
   await db.timeEntry.updateMany({
      where: { id: running.id, userId: session.user.id, endedAt: null },
      data: finishAt(running.startedAt, new Date())
   });
   return { ok: true };
}

/**
 * The signed-in user's finished entries in this workspace from the last 14 days (today and the
 * 13 days before, as calendar days on the user's clock), newest first.
 */
export async function listMyRecentEntries(orgSlug: string, timeZone: string) {
   const { session, organization } = await requireMembership(orgSlug);
   // Midnight 13 days ago in the user's zone, so the oldest day in the list is complete.
   // (Not "now minus 14 × 24 h": that cuts the oldest day in half, and a day isn't always 24 h.)
   const since = new Date(startOfDay(subDays(TZDate.tz(timeZone), 13)).getTime()); // plain Date for Prisma

   return db.timeEntry.findMany({
      where: {
         organizationId: organization.id,
         userId: session.user.id,
         endedAt: { not: null },
         startedAt: { gte: since }
      },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: 200,
      select: {
         id: true,
         description: true,
         startedAt: true,
         endedAt: true,
         durationSec: true,
         billable: true,
         project: {
            select: { id: true, name: true, color: true, client: { select: { name: true } } }
         }
      }
   });
}

/**
 * The signed-in user's finished entries in this workspace that START in [from, to) (UTC instants,
 * e.g. Monday 00:00 to the next Monday 00:00 on the user's clock), for the weekly timesheet.
 * An entry belongs to the day it started on (a timer running past midnight counts for that day).
 */
export async function listMyEntriesBetween(orgSlug: string, from: Date, to: Date) {
   const { session, organization } = await requireMembership(orgSlug);
   return db.timeEntry.findMany({
      where: {
         organizationId: organization.id,
         userId: session.user.id,
         endedAt: { not: null },
         startedAt: { gte: from, lt: to }
      },
      orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
      select: {
         startedAt: true,
         durationSec: true,
         billable: true,
         project: {
            select: { id: true, name: true, color: true, client: { select: { name: true } } }
         }
      }
   });
}

/**
 * Projects to pick from (timer, manual entry): the active ones, sorted by client then project,
 * plus `includeId` even if archived, so an entry's current project still shows up when editing.
 */
export async function listTrackableProjects(orgSlug: string, includeId?: string) {
   const { organization } = await requireMembership(orgSlug);
   return db.project.findMany({
      where: {
         organizationId: organization.id,
         OR: [{ archivedAt: null }, ...(includeId ? [{ id: includeId }] : [])]
      },
      orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, archivedAt: true, client: { select: { name: true } } }
   });
}

/**
 * One of the signed-in user's finished entries in this workspace, or 404 (someone else's entry,
 * another workspace's, or a running timer all look the same). Shared by the page and its metadata.
 */
export const getMyTimeEntry = cache(async (orgSlug: string, entryId: string) => {
   const { session, organization } = await requireMembership(orgSlug);
   const entry = await db.timeEntry.findFirst({
      where: {
         id: entryId,
         organizationId: organization.id,
         userId: session.user.id,
         endedAt: { not: null }
      },
      select: {
         id: true,
         projectId: true,
         description: true,
         billable: true,
         startedAt: true,
         endedAt: true
      }
   });
   if (!entry) notFound();
   return { organization, entry };
});

/**
 * The entry's times as UTC instants. The form's date and times are on the user's clock
 * (`timeZone`). Around a daylight-saving change the end can land before the start (e.g. 02:30 in
 * a skipped hour), which the database would reject: that's reported as a field error instead.
 */
function toInstants(input: TimeEntryInput, timeZone: string) {
   const startedAt = zonedToUtc(input.date, input.start, timeZone);
   const endedAt = zonedToUtc(input.date, input.end, timeZone);
   if (endedAt <= startedAt) return null;
   return { startedAt, ...finishAt(startedAt, endedAt) };
}

const endBeforeStart = {
   ok: false,
   field: 'end',
   message: 'End time must be after the start time'
} as const;

/** Adds a finished entry by hand (forgot the timer). Any member, for themselves. */
export async function createTimeEntry(
   orgSlug: string,
   input: TimeEntryInput,
   timeZone: string
): Promise<TimerResult> {
   const { session, organization } = await requireMembership(orgSlug);

   const project = await db.project.findFirst({
      where: { id: input.projectId, organizationId: organization.id, archivedAt: null },
      select: { id: true }
   });
   if (!project) {
      return { ok: false, field: 'projectId', message: 'Choose one of your active projects.' };
   }
   const times = toInstants(input, timeZone);
   if (!times) return endBeforeStart;

   await db.timeEntry.create({
      data: {
         organizationId: organization.id,
         userId: session.user.id,
         projectId: project.id,
         description: input.description,
         billable: input.billable,
         ...times
      }
   });
   return { ok: true };
}

/** Changes one of the signed-in user's finished entries. */
export async function updateTimeEntry(
   orgSlug: string,
   entryId: string,
   input: TimeEntryInput,
   timeZone: string
): Promise<TimerResult> {
   const { session, organization } = await requireMembership(orgSlug);
   const mine = { id: entryId, organizationId: organization.id, userId: session.user.id };

   const entry = await db.timeEntry.findFirst({
      where: { ...mine, endedAt: { not: null } },
      select: { projectId: true }
   });
   if (!entry) return { ok: false, message: 'This entry no longer exists.' };

   // Another active project of this workspace, or keep the current one even if it's archived.
   const project = await db.project.findFirst({
      where: {
         id: input.projectId,
         organizationId: organization.id,
         ...(input.projectId !== entry.projectId && { archivedAt: null })
      },
      select: { id: true }
   });
   if (!project) {
      return { ok: false, field: 'projectId', message: 'Choose one of your active projects.' };
   }
   const times = toInstants(input, timeZone);
   if (!times) return endBeforeStart;

   await db.timeEntry.updateMany({
      where: { ...mine, endedAt: { not: null } },
      data: {
         projectId: project.id,
         description: input.description,
         billable: input.billable,
         ...times
      }
   });
   return { ok: true };
}

/** Deletes one of the signed-in user's finished entries. (Phase 5: not once it's invoiced.) */
export async function deleteTimeEntry(orgSlug: string, entryId: string): Promise<TimerResult> {
   const { session, organization } = await requireMembership(orgSlug);
   const { count } = await db.timeEntry.deleteMany({
      where: {
         id: entryId,
         organizationId: organization.id,
         userId: session.user.id,
         endedAt: { not: null } // a running timer is stopped, not deleted
      }
   });
   return count ? { ok: true } : { ok: false, message: 'This entry no longer exists.' };
}
