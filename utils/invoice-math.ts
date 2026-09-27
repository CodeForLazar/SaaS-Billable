// Invoice arithmetic, in one place so every caller (and the tests) rounds the same way.
// Money is in integer cents, quantities in integer hundredths (650 = 6.50 hours).

/** Tracked seconds as an invoice quantity in hundredths of an hour (5400 s -> 150 = 1.50 h). Never 0. */
export function secondsToQuantity(seconds: number) {
   return Math.max(1, Math.round(seconds / 36));
}

/** A line's amount: quantity (hundredths) × unit price (cents), rounded to the cent. */
export function lineAmount(quantityHundredths: number, unitPriceCents: number) {
   return Math.round((quantityHundredths * unitPriceCents) / 100);
}

/** Tax on a subtotal: 2000 basis points = 20 %, rounded to the cent. */
export function taxAmount(subtotalCents: number, taxRateBasisPoints: number) {
   return Math.round((subtotalCents * taxRateBasisPoints) / 10_000);
}
