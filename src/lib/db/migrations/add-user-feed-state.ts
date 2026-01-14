import { db } from '../index';
import { sql } from 'drizzle-orm';

export async function addUserFeedStateTable() {
  
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS user_feed_state (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      generated_rows TEXT NOT NULL,
      served_row_ids TEXT NOT NULL,
      last_generated_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_user_feed_state_user_session 
    ON user_feed_state(user_id, session_id)
  `);
  
}
