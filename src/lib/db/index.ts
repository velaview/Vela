import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// ─────────────────────────────────────────────────────────────
// Database Configuration
// ─────────────────────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === 'production';
const DATABASE_URL = process.env.DATABASE_URL || `file:${process.env.DATABASE_PATH || './data/vela.db'}`;
const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

// ─────────────────────────────────────────────────────────────
// Initialize LibSQL Client
// ─────────────────────────────────────────────────────────────

const client = createClient({
  url: DATABASE_URL,
  authToken: AUTH_TOKEN,
});

// ─────────────────────────────────────────────────────────────
// Create Drizzle Instance
// ─────────────────────────────────────────────────────────────

export const db = drizzle(client, { schema });

// ─────────────────────────────────────────────────────────────
// Export Schema
// ─────────────────────────────────────────────────────────────

export * from './schema';
