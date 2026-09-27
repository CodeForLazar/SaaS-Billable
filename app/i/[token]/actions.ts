'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createCheckoutSession } from '@/server/payments';

export type PayState = { error?: string } | undefined;

// "Pay" on the public invoice page. The token is bound by the page; like any input it comes from
// the browser, so the service looks the invoice up by it and checks it can still be paid.
// (useActionState also passes the previous state; this action doesn't need it.)
export async function payInvoiceAction(token: string): Promise<PayState> {
   if (!z.string().min(1).max(100).safeParse(token).success) return { error: 'Invalid request.' };
   const result = await createCheckoutSession(token);
   if (!result.ok) return { error: result.message };
   // To Stripe's hosted payment page (an external URL: redirect() works for those too).
   redirect(result.url);
}
