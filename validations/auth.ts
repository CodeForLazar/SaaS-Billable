import { z } from 'zod';

// Shared by sign-up and password reset so the rules can't drift apart.
const newPassword = z
   .string()
   .min(8, 'Password must be at least 8 characters')
   .max(128, 'Password must be at most 128 characters');

export const signUpSchema = z.object({
   name: z.string().trim().min(2, 'Name must be at least 2 characters'),
   email: z.email('Enter a valid email address'),
   password: newPassword
});

export const signInSchema = z.object({
   email: z.email('Enter a valid email address'),
   password: z.string().min(1, 'Enter your password')
});

export const forgotPasswordSchema = z.object({
   email: z.email('Enter a valid email address')
});

export const resetPasswordSchema = z
   .object({
      token: z.string().min(1),
      password: newPassword,
      confirmPassword: z.string()
   })
   .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords don’t match',
      path: ['confirmPassword']
   });
