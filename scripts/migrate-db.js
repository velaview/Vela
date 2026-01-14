const Database = require('better-sqlite3');

async function runMigration() {
  try {
    console.log('Running database migration...');
    
    const sqlite = new Database('data/watchers.db');
    
    // Add missing columns to preferences table
    try {
      sqlite.exec('ALTER TABLE preferences ADD COLUMN created_at INTEGER');
      console.log('✓ Added created_at column to preferences');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ created_at column already exists in preferences');
      } else {
        throw error;
      }
    }
    
    try {
      sqlite.exec('ALTER TABLE preferences ADD COLUMN updated_at INTEGER');
      console.log('✓ Added updated_at column to preferences');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('✓ updated_at column already exists in preferences');
      } else {
        throw error;
      }
    }

    // Create userHomepageRows table
    try {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS user_homepage_rows (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          row_id TEXT NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          catalog_type TEXT,
          catalog_id TEXT,
          source TEXT,
          extra TEXT,
          priority INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at INTEGER,
          updated_at INTEGER,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Created user_homepage_rows table');
    } catch (error) {
      console.log('✓ user_homepage_rows table already exists');
    }

    // Create unique index for userHomepageRows
    try {
      sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS user_homepage_rows_user_id_row_id_unique ON user_homepage_rows (user_id, row_id)');
      console.log('✓ Created unique index for user_homepage_rows');
    } catch (error) {
      console.log('✓ Index already exists for user_homepage_rows');
    }

    console.log('✅ Migration completed successfully');
    sqlite.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
