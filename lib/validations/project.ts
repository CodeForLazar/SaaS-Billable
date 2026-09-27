import { z } from 'zod';
import { MONEY_PATTERN, inputToCents } from '@/lib/money';
import { PROJECT_COLOR_VALUES } from '@/lib/project-colors';

// The create and edit forms, also checked on the server. The rate arrives as text ("75.50") and
// leaves as cents (7550), or null when empty.
export const projectSchema = z.object({
   name: z.string().trim().min(1, 'Enter a name').max(100, 'Name must be at most 100 characters'),
   clientId: z.string().trim().min(1, 'Choose a client').max(100, 'Choose a client'),
   hourlyRate: z
      .string()
      .trim()
      .refine((value) => !value || MONEY_PATTERN.test(value), 'Enter an amount like 75 or 75.50')
      .transform((value) => (value ? inputToCents(value) : null)),
   color: z.enum(PROJECT_COLOR_VALUES, 'Choose a color')
});

export type ProjectInput = z.infer<typeof projectSchema>;
