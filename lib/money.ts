// Money is stored as integer cents (7550 = 75.50) so sums never pick up floating-point errors.

// Every workspace uses USD until workspace settings (currency, business details) arrive with
// invoices in Phase 5.
export const DEFAULT_CURRENCY = 'USD';

/** 7550 -> "$75.50" */
export function formatMoney(cents: number, currency = DEFAULT_CURRENCY) {
   return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100);
}

/** 7550 -> "75.50", 7500 -> "75": the value shown in a form field. */
export function centsToInput(cents: number | null) {
   if (cents === null) return '';
   return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/**
 * "75.5" -> 7550. Parses the digits as text instead of multiplying a float
 * (0.29 * 100 = 28.999999999999996 in JavaScript). Expects input already checked by MONEY_PATTERN.
 */
export function inputToCents(value: string) {
   const [whole, fraction = ''] = value.split('.');
   return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Up to 6 digits, optionally with 1–2 decimals: "75", "75.5", "75.50". */
export const MONEY_PATTERN = /^\d{1,6}(\.\d{1,2})?$/;
