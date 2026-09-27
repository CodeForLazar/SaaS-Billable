'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { projectSchema } from '@/lib/validations/project';
import {
   type ProjectResult,
   createProject,
   setProjectArchived,
   updateProject
} from '@/server/projects';

const FIELDS = ['name', 'clientId', 'hourlyRate', 'color'] as const;
type ProjectField = (typeof FIELDS)[number];
export type ProjectValues = Record<ProjectField, string>;

export type ProjectFormState =
   | {
        error?: string;
        fieldErrors?: Partial<Record<ProjectField, string[]>>;
        values?: ProjectValues;
     }
   | undefined;

// A form field is a string (or a File for file inputs); anything else counts as empty.
function readFields(formData: FormData) {
   return Object.fromEntries(
      FIELDS.map((field) => {
         const value = formData.get(field);
         return [field, typeof value === 'string' ? value : ''];
      })
   ) as ProjectValues;
}

// Errors go back to the form with what was typed (a client error on the Client field);
// success opens the project's page. redirect() throws, so it stays outside any try/catch.
function finish(result: ProjectResult, values: ProjectValues): ProjectFormState {
   if (!result.ok) {
      return result.field
         ? { fieldErrors: { [result.field]: [result.message] }, values }
         : { error: result.message, values };
   }
   redirect(`/${result.orgSlug}/projects/${result.projectId}`);
}

const id = z.string().min(1).max(100);

// orgSlug (and projectId) are bound by the page. Like every argument, they come from the browser:
// the service checks them against the membership.
export async function createProjectAction(
   orgSlug: string,
   _prevState: ProjectFormState,
   formData: FormData
): Promise<ProjectFormState> {
   const values = readFields(formData);
   const parsed = projectSchema.safeParse(values);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }
   return finish(await createProject(orgSlug, parsed.data), values);
}

export async function updateProjectAction(
   orgSlug: string,
   projectId: string,
   _prevState: ProjectFormState,
   formData: FormData
): Promise<ProjectFormState> {
   const values = readFields(formData);
   if (!id.safeParse(projectId).success) return { error: 'Invalid request.', values };
   const parsed = projectSchema.safeParse(values);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }
   return finish(await updateProject(orgSlug, projectId, parsed.data), values);
}

// Called from the Archive/Restore button's click handler, with plain arguments.
export async function setProjectArchivedAction(
   orgSlug: string,
   projectId: string,
   archived: boolean
): Promise<ProjectResult> {
   const parsed = z
      .object({ projectId: id, archived: z.boolean() })
      .safeParse({ projectId, archived });
   if (!parsed.success) return { ok: false, message: 'Invalid request.' };

   const result = await setProjectArchived(orgSlug, parsed.data.projectId, parsed.data.archived);
   if (result.ok) refresh();
   return result;
}
