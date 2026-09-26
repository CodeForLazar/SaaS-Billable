'use server';

import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { createWorkspaceSchema } from '@/lib/validations/organization';

export type CreateWorkspaceState =
   | {
        error?: string;
        fieldErrors?: { name?: string[]; slug?: string[] };
        values?: { name?: string; slug?: string };
     }
   | undefined;

export async function createWorkspace(
   _prevState: CreateWorkspaceState,
   formData: FormData
): Promise<CreateWorkspaceState> {
   const input = Object.fromEntries(formData);
   const values = { name: String(input.name ?? ''), slug: String(input.slug ?? '') };

   const parsed = createWorkspaceSchema.safeParse(input);
   if (!parsed.success) {
      return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
   }

   try {
      // Checks the session itself (401 if signed out), creates the organization, adds the
      // current user as "owner" and makes it the session's active organization.
      await auth.api.createOrganization({ body: parsed.data, headers: await headers() });
   } catch (error) {
      if (error instanceof APIError) {
         const code = error.body?.code;
         if (code === 'ORGANIZATION_ALREADY_EXISTS' || code === 'ORGANIZATION_SLUG_ALREADY_TAKEN') {
            return { fieldErrors: { slug: ['This URL is already taken. Please choose another one.'] }, values };
         }
         return { error: error.message, values };
      }
      throw error;
   }

   redirect(`/${parsed.data.slug}/dashboard`);
}
