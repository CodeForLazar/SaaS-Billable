import 'server-only';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import type { StartTimerInput } from '@/lib/validations/time-entry';
import { getSession } from '@/lib/session';
import { requireMembership } from '@/server/organizations';

// Time entries belong to a workspace AND a person. Everyone in a workspace tracks their own time;
// these functions only ever touch the signed-in user's entries.

export type TimerResult = { ok: true } | { ok: false; message: string; field?: 'projectId' };

/** Fields that finish an entry: end now, duration in whole seconds. */
function finishAt(startedAt: Date, endedAt: Date) {
   return {
      endedAt,
      durationSec: Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))
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

/** The signed-in user's finished entries in this workspace from the last 14 days, newest first. */
export async function listMyRecentEntries(orgSlug: string) {
   const { session, organization } = await requireMembership(orgSlug);
   const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

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

/** Active projects to pick from when starting a timer, grouped by client name then project. */
export async function listTrackableProjects(orgSlug: string) {
   const { organization } = await requireMembership(orgSlug);
   return db.project.findMany({
      where: { organizationId: organization.id, archivedAt: null },
      orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, client: { select: { name: true } } }
   });
}
