import { z } from 'zod';

// Optional text: surrounding spaces trimmed, an empty field stored as null (not "").
const optionalText = (max: number) =>
   z
      .string()
      .trim()
      .max(max, `Must be at most ${max} characters`)
      .transform((value) => value || null);

// The create and edit forms. Also used on the server, so a request that skips the form is
// checked by the same rules.
export const clientSchema = z.object({
   name: z.string().trim().min(1, 'Enter a name').max(100, 'Name must be at most 100 characters'),
   company: optionalText(100),
   email: z
      .string()
      .trim()
      .max(254, 'Email must be at most 254 characters')
      .refine(
         (value) => !value || z.email().safeParse(value).success,
         'Enter a valid email address'
      )
      .transform((value) => value || null),
   address: optionalText(500),
   notes: optionalText(2000)
});

export type ClientInput = z.infer<typeof clientSchema>;
