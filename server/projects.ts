import 'server-only';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { can } from '@/lib/permissions';
import type { ListQuery } from '@/lib/validations/list';
import type { ProjectInput } from '@/lib/validations/project';
import { requireMembership } from '@/server/organizations';

export const PROJECTS_PAGE_SIZE = 20;

const projectListSelect = {
   id: true,
   name: true,
   color: true,
   hourlyRateCents: true,
   archivedAt: true,
   createdAt: true,
   client: { select: { id: true, name: true } }
} satisfies Prisma.ProjectSelect;

/**
 * One page of the workspace's active (or archived) projects, searchable by project or client
 * name. Every member of the workspace may see its projects.
 */
export async function listProjects(orgSlug: string, query: ListQuery) {
   const { organization, role } = await requireMembership(orgSlug);

   const where: Prisma.ProjectWhereInput = {
      organizationId: organization.id, // tenant scope: always first
      archivedAt: query.status === 'archived' ? { not: null } : null,
      ...(query.q && {
         OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { client: { name: { contains: query.q, mode: 'insensitive' } } }
         ]
      })
   };

   // Count first so a page past the end shows the last page (same as the clients list).
   const total = await db.project.count({ where });
   const pageCount = Math.max(1, Math.ceil(total / PROJECTS_PAGE_SIZE));
   const page = Math.min(query.page, pageCount);

   const projects = await db.project.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * PROJECTS_PAGE_SIZE,
      take: PROJECTS_PAGE_SIZE,
      select: projectListSelect
   });

   return { organization, role, projects, total, page, pageCount, pageSize: PROJECTS_PAGE_SIZE };
}

/** All projects of one client (active first), for the client's page. */
export async function listClientProjects(orgSlug: string, clientId: string) {
   const { organization } = await requireMembership(orgSlug);
   return db.project.findMany({
      where: { organizationId: organization.id, clientId },
      // Postgres sorts NULLs last by default, so active projects (archivedAt = null) need 'first'.
      orderBy: [{ archivedAt: { sort: 'desc', nulls: 'first' } }, { name: 'asc' }, { id: 'asc' }],
      select: projectListSelect
   });
}

/** One project of the workspace (with its client), or 404. Shared by the page and its metadata. */
export const getProject = cache(async (orgSlug: string, projectId: string) => {
   const membership = await requireMembership(orgSlug);

   const project = await db.project.findFirst({
      where: { id: projectId, organizationId: membership.organization.id },
      include: { client: { select: { id: true, name: true, archivedAt: true } } }
   });
   if (!project) notFound();

   return { ...membership, project };
});

export type ProjectResult =
   | { ok: true; projectId: string; orgSlug: string }
   | { ok: false; message: string; field?: 'clientId' };

/**
 * The client a project is being attached to must be in this workspace (the composite foreign key
 * would reject it anyway, but as a crash, not a message) and active.
 */
async function checkClient(organizationId: string, clientId: string, currentClientId?: string) {
   const client = await db.client.findFirst({
      where: { id: clientId, organizationId },
      select: { archivedAt: true }
   });
   // Keeping an archived client that's already set (editing an archived project) is fine.
   if (!client || (client.archivedAt && clientId !== currentClientId)) {
      return {
         ok: false,
         field: 'clientId',
         message: 'Choose one of your active clients.'
      } as const;
   }
   return null;
}

/** Adds a project to one of the workspace's clients. Owners and admins only. */
export async function createProject(orgSlug: string, input: ProjectInput): Promise<ProjectResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { project: ['create'] })) {
      return { ok: false, message: 'You are not allowed to add projects to this workspace.' };
   }
   const invalid = await checkClient(organization.id, input.clientId);
   if (invalid) return invalid;

   const project = await db.project.create({
      data: {
         organizationId: organization.id, // from the membership, not the form
         clientId: input.clientId,
         name: input.name,
         hourlyRateCents: input.hourlyRate,
         color: input.color
      },
      select: { id: true }
   });
   return { ok: true, projectId: project.id, orgSlug: organization.slug };
}

/** Saves the project's details (including moving it to another client). Owners and admins only. */
export async function updateProject(
   orgSlug: string,
   projectId: string,
   input: ProjectInput
): Promise<ProjectResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { project: ['update'] })) {
      return { ok: false, message: 'You are not allowed to edit projects in this workspace.' };
   }

   const project = await db.project.findFirst({
      where: { id: projectId, organizationId: organization.id },
      select: { clientId: true }
   });
   if (!project) return { ok: false, message: 'This project no longer exists.' };

   const invalid = await checkClient(organization.id, input.clientId, project.clientId);
   if (invalid) return invalid;

   await db.project.updateMany({
      where: { id: projectId, organizationId: organization.id },
      data: {
         clientId: input.clientId,
         name: input.name,
         hourlyRateCents: input.hourlyRate,
         color: input.color
      }
   });
   return { ok: true, projectId, orgSlug: organization.slug };
}

/** Archives or restores a project. Owners and admins only. */
export async function setProjectArchived(
   orgSlug: string,
   projectId: string,
   archived: boolean
): Promise<ProjectResult> {
   const { organization, role } = await requireMembership(orgSlug);
   if (!can(role, { project: ['archive'] })) {
      return { ok: false, message: 'You are not allowed to archive projects in this workspace.' };
   }

   const project = await db.project.findFirst({
      where: { id: projectId, organizationId: organization.id },
      select: { archivedAt: true, client: { select: { archivedAt: true } } }
   });
   if (!project) return { ok: false, message: 'This project no longer exists.' };

   // An active project under an archived client would show up in lists the client doesn't.
   if (!archived && project.client.archivedAt) {
      return { ok: false, message: 'Its client is archived. Restore the client first.' };
   }

   if (archived !== !!project.archivedAt) {
      await db.project.updateMany({
         where: { id: projectId, organizationId: organization.id },
         data: { archivedAt: archived ? new Date() : null }
      });
   }
   return { ok: true, projectId, orgSlug: organization.slug };
}
