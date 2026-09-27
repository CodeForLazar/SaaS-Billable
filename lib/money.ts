// Money is stored as integer cents (7550 = 75.50) so sums never pick up floating-point errors.

// A workspace's currency lives in its billing settings (server/settings.ts); this is the default.
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

// Currencies a workspace can bill in. Only currencies with 2 decimals (cents), because every
// amount is stored as an integer number of cents (so no JPY, which has none).
export const CURRENCIES = [
   { code: 'USD', label: 'US dollar' },
   { code: 'EUR', label: 'Euro' },
   { code: 'GBP', label: 'British pound' },
   { code: 'CAD', label: 'Canadian dollar' },
   { code: 'AUD', label: 'Australian dollar' },
   { code: 'NZD', label: 'New Zealand dollar' },
   { code: 'CHF', label: 'Swiss franc' },
   { code: 'SEK', label: 'Swedish krona' },
   { code: 'NOK', label: 'Norwegian krone' },
   { code: 'DKK', label: 'Danish krone' },
   { code: 'PLN', label: 'Polish złoty' },
   { code: 'CZK', label: 'Czech koruna' },
   { code: 'MKD', label: 'Macedonian denar' }
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];
export const CURRENCY_CODES = CURRENCIES.map((currency) => currency.code) as [
   CurrencyCode,
   ...CurrencyCode[]
];

/** "$" for USD, "€" for EUR... (the prefix shown in money inputs). */
export function currencySymbol(currency: string) {
   return (
      new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
         .formatToParts(0)
         .find((part) => part.type === 'currency')?.value ?? currency
   );
}

/** Basis points as a percentage for display/forms: 2000 -> "20", 825 -> "8.25". */
export function basisPointsToPercent(basisPoints: number) {
   return centsToInput(basisPoints);
}
