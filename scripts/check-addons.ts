import { db, systemAddons } from '@/lib/db';

async function checkAddons() {
  const addons = await db.select().from(systemAddons);
  console.log('Installed System Addons:');
  addons.forEach(a => {
    console.log(`- Name: ${JSON.parse(a.manifest).name}`);
    console.log(`  ID: ${a.addonId}`); // This is what we need
    console.log(`  URL: ${a.manifestUrl}`);
    console.log('---');
  });
}

checkAddons().catch(console.error);
