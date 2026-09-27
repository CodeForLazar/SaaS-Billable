import 'server-only';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { can } from '@/lib/permissions';
import type { ClientInput } from '@/validations/client';
import type { ListQuery } from '@/validations/list';
import { requireMembership } from '@/server/organizations';

export const CLIENTS_PAGE_SIZE = 20;

/**
 * One page of the workspace's active (or archived) clients, optionally filtered by a search term
 * (name, company or email; case-insensitive). Every member of the workspace may see its clients.
 */
export async function listClients(orgSlug: string, query: ListQuery) {
   const { organization, role } = await requireMembership(orgSlug);

   const where: Prisma.ClientWhereInput = {
      organizationId: organization.id, // tenant scope: always first
      archivedAt: query.status === 'archived' ? { not: null } : null,
      ...(query.q && {
         OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { company: { contains: query.q, mode: 'insensitive' } },
            { email: { contains: query.q, mode: 'insensitive' } }
         ]
      })
   };

   // Count first, so a page number past the end (e.g. ?page=99) shows the last page instead of
   // an empty one.
   const total = await db.client.count({ where });
   const pageCount = Math.max(1, Math.ceil(total / CLIENTS_PAGE_SIZE));
   const page = Math.min(query.page, pageCount);

   const clients = await db.client.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }], // id as a tie-breaker keeps paging stable
      skip: (page - 1) * CLIENTS_PAGE_SIZE,
      take: CLIENTS_PAGE_SIZE,
      select: {
         id: true,
         name: true,
         company: true,
         email: true,
         createdAt: true,
         archivedAt: true,
         // Active clients: their active projects. Archived clients: all their projects (archiving
         // the client archived them too).
         _count: {
            select: {
               projects: query.status === 'archived' ? true : { where: { archivedAt: null } }
            }
         }
      }
   });

   return { organization, role, clients, total, page, pageCount, pageSize: CLIENTS_PAGE_SIZE };
}

/**
 * One client of the workspace, or 404. A client of another workspace is treated exactly like one
 * that doesn't exist. cache() lets the page and its generateMetadata share one lookup.
 */
export const getClient = cache(async (orgSlug: string, clientId: string) => {
   const membership = await requireMembership(orgSlug);

   const client = await db.client.findFirst({
      where: { id: clientId, organizationId: membership.organization.id }
   });
   if (!client) notFound();

   return { ...membership, client };
});

/**
 * Clients to pick from in a form (e.g. a project's client): the active ones, by name, plus
 * `includeId` even if archived, so an existing record's current client still shows up.
 */
export async function listClientOptions(orgSlug: string, includeId?: string) {
   const { organization } = await requireMembership(orgSlug);
   return db.client.findMany({
      where: {
         organizationId: organization.id,
         OR: [{ archivedAt: null }, ...(includeId ? [{ id: includeId }] : [])]
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, archivedAt: true }
   });
}

export type ClientResult =
   { ok: true; clientId: string; orgSlug: string } | { ok: false; message: string };

/** Adds a client to the workspace. Owners and admins only. */
export async function createClient(orgSlug: string, input: ClientInput): Promise<ClientResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { client: ['create'] })) {
      return { ok: false, message: 'You are not allowed to add clients to this workspace.' };
   }

   const client = await db.client.create({
      data: { ...input, organizationId: organization.id }, // workspace from the membership, not the form
      select: { id: true }
   });
   return { ok: true, clientId: client.id, orgSlug: organization.slug };
}

/** Saves the client's details. Owners and admins only. */
export async function updateClient(
   orgSlug: string,
   clientId: string,
   input: ClientInput
): Promise<ClientResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { client: ['update'] })) {
      return { ok: false, message: 'You are not allowed to edit clients in this workspace.' };
   }

   // updateMany (not update) so the workspace can be part of the filter: an id from another
   // workspace matches nothing, same as a deleted client.
   const { count } = await db.client.updateMany({
      where: { id: clientId, organizationId: organization.id },
      data: input
   });
   if (count === 0) return { ok: false, message: 'This client no longer exists.' };

   return { ok: true, clientId, orgSlug: organization.slug };
}

/**
 * Archives or restores a client. Owners and admins only.
 *
 * Archiving also archives the client's active projects, with the same timestamp, so restoring
 * can bring back exactly those and leave projects that were archived on their own alone.
 * One transaction: either the client and its projects all change, or nothing does.
 */
export async function setClientArchived(
   orgSlug: string,
   clientId: string,
   archived: boolean
): Promise<ClientResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { client: ['archive'] })) {
      return { ok: false, message: 'You are not allowed to archive clients in this workspace.' };
   }

   const client = await db.client.findFirst({
      where: { id: clientId, organizationId: organization.id },
      select: { archivedAt: true }
   });
   if (!client) return { ok: false, message: 'This client no longer exists.' };

   const done: ClientResult = { ok: true, clientId, orgSlug: organization.slug };
   if (archived === !!client.archivedAt) return done; // already in that state (e.g. double click)

   const scope = { clientId, organizationId: organization.id };
   if (archived) {
      const now = new Date();
      await db.$transaction([
         db.client.updateMany({
            where: { id: clientId, organizationId: organization.id },
            data: { archivedAt: now }
         }),
         db.project.updateMany({ where: { ...scope, archivedAt: null }, data: { archivedAt: now } })
      ]);
   } else {
      await db.$transaction([
         db.client.updateMany({
            where: { id: clientId, organizationId: organization.id },
            data: { archivedAt: null }
         }),
         db.project.updateMany({
            where: { ...scope, archivedAt: client.archivedAt },
            data: { archivedAt: null }
         })
      ]);
   }
   return done;
}
