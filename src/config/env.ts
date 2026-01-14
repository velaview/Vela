import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Environment Variable Schema
// ─────────────────────────────────────────────────────────────

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Database
  DATABASE_PATH: z.string().default('./data/vela.db'),

  // TorBox (optional - user provides their own key)
  TORBOX_API_KEY: z.string().optional(),

  // Encryption key for storing user's TorBox API keys
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),
});

// ─────────────────────────────────────────────────────────────
// Parse and Validate Environment
// ─────────────────────────────────────────────────────────────

function getEnv() {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
    DATABASE_PATH: process.env.DATABASE_PATH,
    TORBOX_API_KEY: process.env.TORBOX_API_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  });

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

// ─────────────────────────────────────────────────────────────
// Export validated env
// ─────────────────────────────────────────────────────────────

export const env = getEnv();

// Type for the environment
export type Env = z.infer<typeof envSchema>;
