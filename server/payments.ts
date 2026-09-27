import 'server-only';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { formatMoney } from '@/lib/money';
import { STRIPE_MINIMUM_CENTS, getStripe } from '@/lib/stripe';
import { getPublicInvoice, publicInvoiceUrl } from '@/server/invoices';

// Online payments with Stripe Checkout (Stripe's hosted payment page). The client never signs in:
// everything starts from the invoice's public token. All payments go to the platform's Stripe
// account (see the decision log; Stripe Connect would route them to each freelancer).

export type CheckoutResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * A Checkout session for the full amount of an unpaid invoice, found by its public token.
 * Returns the URL of Stripe's payment page to send the client to.
 */
export async function createCheckoutSession(token: string): Promise<CheckoutResult> {
   const found = await getPublicInvoice(token);
   if (!found) return { ok: false, message: 'This invoice no longer exists.' };
   const { invoice } = found;
   if (invoice.status !== 'SENT') {
      return {
         ok: false,
         message:
            invoice.status === 'PAID'
               ? 'This invoice has already been paid.'
               : 'This invoice can no longer be paid.'
      };
   }
   const minimum = STRIPE_MINIMUM_CENTS[invoice.currency] ?? 0;
   if (invoice.totalCents < Math.max(minimum, 1)) {
      return {
         ok: false,
         message: `Online payment isn't available for amounts under ${formatMoney(minimum, invoice.currency)}.`
      };
   }

   const url = publicInvoiceUrl(token);
   // Which invoice this is about travels in the session's metadata; the webhook reads it back.
   const metadata = { invoiceId: invoice.id, organizationId: invoice.organizationId };
   try {
      const session = await getStripe().checkout.sessions.create({
         mode: 'payment',
         // Adaptive Pricing would offer the client their local currency (plus a conversion fee);
         // an invoice is issued in its own currency, so that's what the client pays.
         adaptive_pricing: { enabled: false },
         line_items: [
            {
               quantity: 1,
               price_data: {
                  currency: invoice.currency.toLowerCase(),
                  unit_amount: invoice.totalCents, // the whole invoice, tax included
                  product_data: {
                     name: `Invoice ${invoice.number}`,
                     description: `From ${invoice.fromName}`
                  }
               }
            }
         ],
         customer_email: invoice.billToEmail ?? undefined,
         client_reference_id: invoice.id,
         metadata,
         payment_intent_data: { metadata, description: `Invoice ${invoice.number}` },
         // {CHECKOUT_SESSION_ID} is filled in by Stripe. /paid (a route handler) confirms that
         // session and then shows the invoice.
         success_url: `${url}/paid?session_id={CHECKOUT_SESSION_ID}`,
         cancel_url: `${url}?payment=cancelled`
      });
      if (!session.url) throw new Error('Stripe returned no Checkout URL');
      return { ok: true, url: session.url };
   } catch (error) {
      console.error('Creating the Stripe Checkout session failed', error);
      return {
         ok: false,
         message: 'Online payment is not available right now. Please try again later.'
      };
   }
}

/**
 * Records a paid Checkout session: a Payment row, and SENT -> PAID if the amount covers the
 * invoice. Safe to call more than once for the same session (webhook retries, the thank-you page
 * and the webhook racing): the unique session id makes the second call a no-op.
 * Called by the webhook (signed by Stripe) and by the thank-you page (after fetching the session
 * from Stripe itself), never with data from the browser.
 */
export async function recordCheckoutPayment(session: Stripe.Checkout.Session) {
   if (session.payment_status !== 'paid') return { recorded: false as const, reason: 'not paid' };
   const invoiceId = session.metadata?.invoiceId;
   const organizationId = session.metadata?.organizationId;
   if (!invoiceId || !organizationId || session.amount_total === null) {
      return { recorded: false as const, reason: 'not one of our invoice sessions' };
   }

   const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      select: { id: true, status: true, totalCents: true, currency: true }
   });
   if (!invoice) {
      console.error('Stripe payment for an unknown invoice', { invoiceId, session: session.id });
      return { recorded: false as const, reason: 'unknown invoice' };
   }

   // If Stripe converted the price into the client's currency (Adaptive Pricing, which we turn
   // off), `currency_conversion` holds the amounts in the invoice's own currency: compare those.
   const conversion = session.currency_conversion;
   const amountCents = conversion?.amount_total ?? session.amount_total;
   const currency = (conversion?.source_currency ?? session.currency ?? '').toUpperCase();
   const coversInvoice = amountCents >= invoice.totalCents && currency === invoice.currency;
   const paymentIntentId =
      typeof session.payment_intent === 'string'
         ? session.payment_intent
         : session.payment_intent?.id;

   try {
      await db.$transaction(async (tx) => {
         await tx.payment.create({
            data: {
               organizationId,
               invoiceId,
               amountCents, // in the invoice's currency
               currency,
               stripeCheckoutSessionId: session.id,
               stripePaymentIntentId: paymentIntentId ?? null,
               paidAt: new Date((session.created ?? Date.now() / 1000) * 1000)
            }
         });
         // Only a SENT invoice becomes PAID (a void one stays void: the money is recorded anyway).
         if (coversInvoice) {
            await tx.invoice.updateMany({
               where: { id: invoiceId, organizationId, status: 'SENT' },
               data: { status: 'PAID', paidAt: new Date() }
            });
         } else {
            console.error('Stripe payment does not match the invoice', {
               invoiceId,
               session: session.id,
               paid: `${amountCents} ${currency}`,
               due: `${invoice.totalCents} ${invoice.currency}`
            });
         }
      });
   } catch (error) {
      // Already recorded (unique session id): nothing to do.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
         return { recorded: false as const, reason: 'already recorded' };
      }
      throw error;
   }
   return { recorded: true as const };
}

/**
 * The client came back from Stripe (/i/<token>/paid?session_id=...). Fetch that session from
 * Stripe (the URL itself proves nothing) and record it if it's paid and belongs to this invoice,
 * so the invoice shows "Paid" right away instead of waiting for the webhook.
 */
export async function confirmCheckoutReturn(
   token: string,
   sessionId: string
): Promise<'paid' | 'processing' | 'unknown'> {
   if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) return 'unknown';
   const found = await getPublicInvoice(token);
   if (!found) return 'unknown';
   try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.metadata?.invoiceId !== found.invoice.id) return 'unknown'; // another invoice's
      if (session.payment_status === 'paid') {
         await recordCheckoutPayment(session);
         return 'paid';
      }
      // Completed but not paid yet: a slower method (bank debit) that Stripe confirms later.
      return session.status === 'complete' ? 'processing' : 'unknown';
   } catch (error) {
      // An id Stripe doesn't know (a typo, or someone trying ids) is expected: no log noise.
      if (error instanceof Stripe.errors.StripeInvalidRequestError) return 'unknown';
      // Anything else isn't fatal either: if it was paid, the webhook records it anyway.
      console.error('Confirming the Stripe Checkout return failed', error);
      return 'unknown';
   }
}

/** An invoice's payments, newest first (for the app's invoice page). */
export async function listInvoicePayments(organizationId: string, invoiceId: string) {
   return db.payment.findMany({
      where: { organizationId, invoiceId },
      orderBy: { paidAt: 'desc' },
      select: { id: true, amountCents: true, currency: true, paidAt: true }
   });
}
