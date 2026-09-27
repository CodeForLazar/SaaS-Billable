import { z } from 'zod';

// Field rules shared by several forms.

/** Optional text: surrounding spaces trimmed, an empty field stored as null (not ""). */
export const optionalText = (max: number) =>
   z
      .string()
      .trim()
      .max(max, `Must be at most ${max} characters`)
      .transform((value) => value || null);

/** Optional email: empty -> null, otherwise a valid address. */
export const optionalEmail = z
   .string()
   .trim()
   .max(254, 'Email must be at most 254 characters')
   .refine((value) => !value || z.email().safeParse(value).success, 'Enter a valid email address')
   .transform((value) => value || null);

/** A whole number typed into a text field, within [min, max]. */
export const wholeNumber = (min: number, max: number, message: string) =>
   z
      .string()
      .trim()
      .regex(/^\d{1,7}$/, message)
      .transform(Number)
      .refine((value) => value >= min && value <= max, message);

/** A percentage like "20" or "8.25" -> basis points (2000, 825). Empty means 0. */
export const percentToBasisPoints = z
   .string()
   .trim()
   .refine(
      (value) => !value || (/^\d{1,3}(\.\d{1,2})?$/.test(value) && Number(value) <= 100),
      'Enter a percentage between 0 and 100, like 20 or 8.25'
   )
   .transform((value) => {
      if (!value) return 0;
      const [whole, fraction = ''] = value.split('.');
      return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
   });
