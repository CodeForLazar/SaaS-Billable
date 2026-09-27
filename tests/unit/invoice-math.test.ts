import { describe, expect, it } from 'vitest';
import { lineAmount, secondsToQuantity, taxAmount } from '@/utils/invoice-math';

describe('secondsToQuantity', () => {
   it('turns tracked seconds into hundredths of an hour', () => {
      expect(secondsToQuantity(3600)).toBe(100); // 1.00 h
      expect(secondsToQuantity(5400)).toBe(150); // 1.50 h
      expect(secondsToQuantity(12_600)).toBe(350); // 3.50 h
   });

   it('rounds to the nearest hundredth (36 seconds)', () => {
      expect(secondsToQuantity(3617)).toBe(100); // 100.47 -> 100
      expect(secondsToQuantity(3618)).toBe(101); // 100.5 -> 101
   });

   it('never bills zero hours (the smallest line is 0.01 h)', () => {
      expect(secondsToQuantity(0)).toBe(1);
      expect(secondsToQuantity(10)).toBe(1);
   });
});

describe('lineAmount', () => {
   it('multiplies quantity (hundredths) by the unit price (cents)', () => {
      expect(lineAmount(350, 7500)).toBe(26_250); // 3.50 h × $75.00 = $262.50
      expect(lineAmount(100, 9950)).toBe(9950);
      expect(lineAmount(1, 12_000)).toBe(120); // 0.01 h × $120.00 = $1.20
   });

   it('rounds to the cent', () => {
      expect(lineAmount(333, 3333)).toBe(11_099); // 3.33 × $33.33 = $110.9889
      expect(lineAmount(150, 1)).toBe(2); // $0.015 -> 2 cents (half rounds up)
   });
});

describe('taxAmount', () => {
   it('applies a rate in basis points (2000 = 20 %)', () => {
      expect(taxAmount(26_250, 2000)).toBe(5250);
      expect(taxAmount(10_000, 825)).toBe(825); // 8.25 %
      expect(taxAmount(12_345, 0)).toBe(0);
   });

   it('rounds to the cent', () => {
      expect(taxAmount(999, 2000)).toBe(200); // 199.8
      expect(taxAmount(1, 5000)).toBe(1); // 0.5 rounds up
   });
});
