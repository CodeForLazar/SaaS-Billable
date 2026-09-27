import { z } from 'zod';

// ?q=...&page=... on the clients list. It comes from the URL, so anyone can type anything:
// bad values fall back to defaults instead of erroring (.catch).
export const clientListQuerySchema = z.object({
   q: z.string().trim().max(100).catch(''),
   page: z.coerce.number().int().min(1).max(10_000).catch(1)
});

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
