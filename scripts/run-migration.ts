#!/usr/bin/env tsx

import { addUserFeedStateTable } from '../src/lib/db/migrations/add-user-feed-state';
import { addEnhancedMetadataColumns } from '../src/lib/db/migrations/add-enhanced-metadata';

async function runMigrations() {
  console.log('='.repeat(50));
  console.log('Running Database Migrations');
  console.log('='.repeat(50));

  try {
    await addUserFeedStateTable();
    await addEnhancedMetadataColumns();
    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
