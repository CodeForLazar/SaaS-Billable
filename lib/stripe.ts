import 'server-only';
import Stripe from 'stripe';

// One Stripe client for the server, created on first use (not at import): `next build` loads
// modules without the secret key being needed, and a missing key then fails with a clear message
// only where payments are actually used.
let client: Stripe | null = null;

export function getStripe() {
   if (!client) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
      client = new Stripe(key);
   }
   return client;
}

/**
 * The smallest amount Stripe accepts, in the currency's cents (about 0.50 USD in each; Stripe
 * rejects smaller charges). For currencies not listed, Stripe's own error is shown.
 */
export const STRIPE_MINIMUM_CENTS: Record<string, number> = {
   USD: 50,
   EUR: 50,
   GBP: 30,
   CAD: 50,
   AUD: 50,
   NZD: 50,
   CHF: 50,
   SEK: 300,
   NOK: 300,
   DKK: 250,
   PLN: 200,
   CZK: 1500
};
