import { z } from 'zod';

// ?q=...&page=...&status=... on list pages. It comes from the URL, so anyone can type anything:
// bad values fall back to defaults instead of erroring (.catch).
export const listQuerySchema = z.object({
   q: z.string().trim().max(100).catch(''),
   page: z.coerce.number().int().min(1).max(10_000).catch(1),
   status: z.enum(['active', 'archived']).catch('active')
});

export type ListQuery = z.infer<typeof listQuerySchema>;

/** The URL for a list with some query values changed. Defaults are left out: /clients, not /clients?page=1&status=active. */
export function listHref(basePath: string, query: ListQuery, changes: Partial<ListQuery> = {}) {
   const next = { ...query, ...changes };
   const params = new URLSearchParams();
   if (next.q) params.set('q', next.q);
   if (next.status !== 'active') params.set('status', next.status);
   if (next.page > 1) params.set('page', String(next.page));
   const qs = params.toString();
   return qs ? `${basePath}?${qs}` : basePath;
}
