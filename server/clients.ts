import 'server-only';
import { db } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import type { ClientListQuery } from '@/lib/validations/client';
import { requireMembership } from '@/server/organizations';

export const CLIENTS_PAGE_SIZE = 20;

/**
 * One page of the workspace's active clients, optionally filtered by a search term
 * (name, company or email; case-insensitive). Every member of the workspace may see its clients.
 */
export async function listClients(orgSlug: string, query: ClientListQuery) {
   const { organization } = await requireMembership(orgSlug);

   const where: Prisma.ClientWhereInput = {
      organizationId: organization.id, // tenant scope: always first
      archivedAt: null,
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
         _count: { select: { projects: { where: { archivedAt: null } } } }
      }
   });

   return { organization, clients, total, page, pageCount, pageSize: CLIENTS_PAGE_SIZE };
}
