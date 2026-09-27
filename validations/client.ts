import { z } from 'zod';
import { optionalEmail, optionalText } from '@/validations/common';

// The create and edit forms. Also used on the server, so a request that skips the form is
// checked by the same rules.
export const clientSchema = z.object({
   name: z.string().trim().min(1, 'Enter a name').max(100, 'Name must be at most 100 characters'),
   company: optionalText(100),
   email: optionalEmail,
   address: optionalText(500),
   notes: optionalText(2000)
});

export type ClientInput = z.infer<typeof clientSchema>;
