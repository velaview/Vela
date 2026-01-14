import { db, contents, streamCache, catalogEntries } from '@/lib/db';
import { count } from 'drizzle-orm';

async function checkCache() {
  const contentCount = await db.select({ count: count() }).from(contents);
  const streamCount = await db.select({ count: count() }).from(streamCache);
  const catalogCount = await db.select({ count: count() }).from(catalogEntries);

  console.log('Cache Status:');
  console.log(`- Contents: ${contentCount[0].count}`);
  console.log(`- Streams: ${streamCount[0].count}`);
  console.log(`- Catalog Entries: ${catalogCount[0].count}`);
}

checkCache().catch(console.error);
