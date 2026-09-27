import { redirect } from 'next/navigation';
import { confirmCheckoutReturn } from '@/server/payments';

// GET /i/<token>/paid?session_id=...: where Stripe sends the client after paying. A Route Handler
// (not a page) because it writes: it records the payment if Stripe confirms it, then shows the
// invoice ("Paid" or "processing", without the session id in the address bar).
export async function GET(request: Request, { params }: RouteContext<'/i/[token]/paid'>) {
   const { token } = await params;
   const sessionId = new URL(request.url).searchParams.get('session_id');
   const outcome = sessionId ? await confirmCheckoutReturn(token, sessionId) : 'unknown';
   // Only say "paid" / "processing" when Stripe said so; anything else shows the invoice as is.
   const invoiceUrl = `/i/${encodeURIComponent(token)}`;
   redirect(outcome === 'unknown' ? invoiceUrl : `${invoiceUrl}?payment=${outcome}`);
}
