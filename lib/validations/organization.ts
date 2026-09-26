import { z } from 'zod';
import { RESERVED_SLUGS, SLUG_MAX_LENGTH } from '@/lib/slug';

export const createWorkspaceSchema = z.object({
   name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name must be at most 50 characters'),
   slug: z
      .string()
      .trim()
      .min(3, 'URL must be at least 3 characters')
      .max(SLUG_MAX_LENGTH, `URL must be at most ${SLUG_MAX_LENGTH} characters`)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single dashes')
      .refine(
         (slug) => !RESERVED_SLUGS.has(slug),
         'This URL is reserved. Please choose another one.'
      )
});

// Roles that can be given through an invitation. Making someone an owner is a separate,
// owner-only action (see "manage members").
export const INVITABLE_ROLES = ['member', 'admin'] as const;

export const inviteMemberSchema = z.object({
   email: z.email('Enter a valid email address'),
   role: z.enum(INVITABLE_ROLES, 'Choose a role')
});
