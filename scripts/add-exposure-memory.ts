// Manual script to add exposure memory fields to user_feed_state table

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'watchers.db');
const db = new Database(dbPath);

try {
  console.log('[Migration] Adding exposure memory fields to user_feed_state...');
  
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(user_feed_state)").all();
  const existingColumns = tableInfo.map((row: any) => row.name);
  
  console.log('[Migration] Existing columns:', existingColumns);
  
  // Add columns if they don't exist
  const columnsToAdd = [
    'recent_items',
    'recent_row_types', 
    'avg_session_length',
    'completion_rate',
    'top_genres',
    'top_languages'
  ];
  
  for (const column of columnsToAdd) {
    if (!existingColumns.includes(column)) {
      console.log(`[Migration] Adding column: ${column}`);
      
      let sql = '';
      switch (column) {
        case 'recent_items':
        case 'recent_row_types':
        case 'top_genres':
        case 'top_languages':
          sql = `ALTER TABLE user_feed_state ADD COLUMN ${column} TEXT DEFAULT '[]'`;
          break;
        case 'avg_session_length':
        case 'completion_rate':
          sql = `ALTER TABLE user_feed_state ADD COLUMN ${column} INTEGER DEFAULT 0`;
          break;
      }
      
      if (sql) {
        db.exec(sql);
        console.log(`[Migration] ✓ Added ${column}`);
      }
    } else {
      console.log(`[Migration] Column ${column} already exists`);
    }
  }
  
  console.log('[Migration] ✅ Successfully added exposure memory fields');
  
} catch (error) {
  console.error('[Migration] Error:', error);
  process.exit(1);
} finally {
  db.close();
}
