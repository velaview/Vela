// Migration: Add exposure memory fields to user_feed_state table

import { db } from '../index';
import { sql } from 'drizzle-orm';

export async function addExposureMemory() {

  try {
    // Add new columns to user_feed_state
    await db.run(sql`
      ALTER TABLE user_feed_state 
      ADD COLUMN recent_items TEXT DEFAULT '[]'
    `);

    await db.run(sql`
      ALTER TABLE user_feed_state 
      ADD COLUMN recent_row_types TEXT DEFAULT '[]'
    `);

    await db.run(sql`
      ALTER TABLE user_feed_state 
      ADD COLUMN avg_session_length INTEGER DEFAULT 0
    `);

    await db.run(sql`
      ALTER TABLE user_feed_state 
      ADD COLUMN completion_rate INTEGER DEFAULT 0
    `);

    await db.run(sql`
      ALTER TABLE user_feed_state 
      ADD COLUMN top_genres TEXT DEFAULT '[]'
    `);

    await db.run(sql`
      ALTER TABLE user_feed_state 
      ADD COLUMN top_languages TEXT DEFAULT '[]'
    `);

  } catch (error) {
    console.error('[Migration] Error adding exposure memory fields:', error);
    throw error;
  }
}
