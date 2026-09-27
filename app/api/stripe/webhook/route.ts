import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { recordCheckoutPayment } from '@/server/payments';

// POST /api/stripe/webhook: Stripe calls this when something happens (a Checkout was paid...).
// Like an Express route that must see the RAW body: the signature is computed over the exact
// bytes Stripe sent, so we read request.text(), never parsed JSON.
export async function POST(request: Request) {
   const signature = request.headers.get('stripe-signature');
   const secret = process.env.STRIPE_WEBHOOK_SECRET;
   if (!signature || !secret) return new Response('Missing signature', { status: 400 });

   let event: Stripe.Event;
   try {
      event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
   } catch {
      // Not from Stripe (or the secret is wrong): refuse. Stripe shows the 400 in its dashboard.
      return new Response('Invalid signature', { status: 400 });
   }

   switch (event.type) {
      // Card payments are paid when the Checkout completes; slower methods (bank debits) complete
      // first and report "async_payment_succeeded" later. recordCheckoutPayment ignores unpaid
      // sessions and is safe to call twice for the same one.
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
         await recordCheckoutPayment(event.data.object);
         break;
      default:
         break; // other events: nothing to do, but acknowledge them
   }
   // Any 2xx tells Stripe "received"; otherwise it retries for up to 3 days.
   return Response.json({ received: true });
}
