import { describe, expect, it } from 'vitest';
import {
   MONEY_PATTERN,
   basisPointsToPercent,
   centsToInput,
   currencySymbol,
   formatMoney,
   inputToCents
} from '@/utils/money';

describe('inputToCents', () => {
   it('parses typed amounts into cents', () => {
      expect(inputToCents('75')).toBe(7500);
      expect(inputToCents('75.5')).toBe(7550);
      expect(inputToCents('75.50')).toBe(7550);
      expect(inputToCents('0.01')).toBe(1);
      expect(inputToCents('999999.99')).toBe(99999999);
   });

   it('has no floating-point errors (0.29 * 100 is 28.999999999999996 in JavaScript)', () => {
      expect(inputToCents('0.29')).toBe(29);
      expect(inputToCents('1.15')).toBe(115);
      expect(inputToCents('4.35')).toBe(435);
   });
});

describe('MONEY_PATTERN', () => {
   it.each(['0', '75', '75.5', '75.50', '999999.99'])('accepts %s', (value) => {
      expect(MONEY_PATTERN.test(value)).toBe(true);
   });

   it.each(['', '.5', '75.', '12.345', '-5', '1,000', '1e3', '1000000', ' 75'])(
      'rejects "%s"',
      (value) => {
         expect(MONEY_PATTERN.test(value)).toBe(false);
      }
   );
});

describe('centsToInput', () => {
   it('shows whole amounts without decimals and others with two', () => {
      expect(centsToInput(7500)).toBe('75');
      expect(centsToInput(7550)).toBe('75.50');
      expect(centsToInput(1)).toBe('0.01');
      expect(centsToInput(null)).toBe('');
   });

   it('round-trips with inputToCents', () => {
      for (const cents of [0, 1, 29, 7550, 12345, 99999999]) {
         expect(inputToCents(centsToInput(cents))).toBe(cents);
      }
   });

   it('formats basis points as a percentage', () => {
      expect(basisPointsToPercent(2000)).toBe('20');
      expect(basisPointsToPercent(825)).toBe('8.25');
   });
});

describe('formatMoney and currencySymbol', () => {
   it('formats cents in the given currency', () => {
      expect(formatMoney(7550, 'USD')).toBe('$75.50');
      expect(formatMoney(123456, 'EUR')).toBe('€1,234.56');
      expect(formatMoney(0)).toBe('$0.00'); // USD by default
   });

   it('gives the symbol shown in money inputs', () => {
      expect(currencySymbol('USD')).toBe('$');
      expect(currencySymbol('EUR')).toBe('€');
      expect(currencySymbol('GBP')).toBe('£');
   });
});
