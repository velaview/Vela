// Use HTTP client for Cloudflare Workers (no WebSocket dependency)
import { createClient, type Client } from '@libsql/client/http';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';

// ─────────────────────────────────────────────────────────────
// Database Configuration (Lazy Initialization)
// ─────────────────────────────────────────────────────────────

let _client: Client | null = null;
let _db: LibSQLDatabase<typeof schema> | null = null;

function getClient(): Client {
  if (!_client) {
    const DATABASE_URL = process.env.DATABASE_URL;
    const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    _client = createClient({
      url: DATABASE_URL,
      authToken: AUTH_TOKEN,
    });
  }
  return _client;
}

// ─────────────────────────────────────────────────────────────
// Lazy Database Instance
// ─────────────────────────────────────────────────────────────

export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_target, prop) {
    if (!_db) {
      _db = drizzle(getClient(), { schema });
    }
    return (_db as any)[prop];
  },
});

// ─────────────────────────────────────────────────────────────
// Export Schema
// ─────────────────────────────────────────────────────────────

export * from './schema';
