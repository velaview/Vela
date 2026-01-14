import { db } from '../index';
import { sql } from 'drizzle-orm';

export async function addEnhancedMetadataColumns() {

  try {
    // Add columns to contents table
    await db.run(sql`ALTER TABLE contents ADD COLUMN studios TEXT`);
    await db.run(sql`ALTER TABLE contents ADD COLUMN status TEXT`);
  } catch (e) {
  }

  try {
    // Add columns to preferences table
    await db.run(sql`ALTER TABLE preferences ADD COLUMN preferred_studios TEXT`);
    await db.run(sql`ALTER TABLE preferences ADD COLUMN preferred_actors TEXT`);
    await db.run(sql`ALTER TABLE preferences ADD COLUMN preferred_directors TEXT`);
    await db.run(sql`ALTER TABLE preferences ADD COLUMN location TEXT`);
  } catch (e) {
  }
  
}
