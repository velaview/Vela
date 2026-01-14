import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Password Schema
// ─────────────────────────────────────────────────────────────

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// ─────────────────────────────────────────────────────────────
// Email Schema
// ─────────────────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required')
  .max(255, 'Email must be at most 255 characters');

// ─────────────────────────────────────────────────────────────
// Display Name Schema
// ─────────────────────────────────────────────────────────────

export const displayNameSchema = z
  .string()
  .min(2, 'Display name must be at least 2 characters')
  .max(50, 'Display name must be at most 50 characters')
  .regex(/^[a-zA-Z0-9\s_-]+$/, 'Display name can only contain letters, numbers, spaces, underscores, and hyphens');

// ─────────────────────────────────────────────────────────────
// Registration Schema
// ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ─────────────────────────────────────────────────────────────
// Login Schema
// ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
