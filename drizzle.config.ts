import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL || `file:${process.env.DATABASE_PATH || './data/watchers.db'}`,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
