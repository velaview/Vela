// Test Hanime connection
// Run with: npx tsx scripts/test-hanime.ts

import { config } from 'dotenv';
config({ path: '.env.local' });

async function testHanime() {
    const email = process.env.HANIME_EMAIL;
    const password = process.env.HANIME_PASSWORD;

    console.log('='.repeat(60));
    console.log('HANIME CONNECTION TEST');
    console.log('='.repeat(60));

    if (!email || !password) {
        console.log('❌ ERROR: Missing HANIME_EMAIL or HANIME_PASSWORD in .env.local');
        console.log('');
        console.log('Add these to your .env.local:');
        console.log('  HANIME_EMAIL=your-email@example.com');
        console.log('  HANIME_PASSWORD=your-password');
        process.exit(1);
    }

    console.log(`📧 Email: ${email.substring(0, 3)}***`);
    console.log(`🔑 Password: ${'*'.repeat(password.length)}`);
    console.log('');

    const HANIME_API = 'https://hanime-stremio.fly.dev';
    const encodedEmail = encodeURIComponent(email);
    const encodedPassword = encodeURIComponent(password);

    // Test 1: Manifest
    console.log('1. Testing manifest...');
    try {
        const manifestUrl = `${HANIME_API}/${encodedEmail}/${encodedPassword}/manifest.json`;
        const res = await fetch(manifestUrl);
        if (res.ok) {
            const data = await res.json();
            console.log(`   ✅ Manifest loaded: ${data.name} v${data.version}`);
            console.log(`   📦 Catalogs: ${data.catalogs?.length || 0}`);
        } else {
            console.log(`   ❌ HTTP ${res.status}: ${res.statusText}`);
        }
    } catch (err: any) {
        console.log(`   ❌ Error: ${err.message}`);
    }

    // Test 2: Catalog
    console.log('');
    console.log('2. Testing catalog...');
    try {
        const catalogUrl = `${HANIME_API}/${encodedEmail}/${encodedPassword}/catalog/anime/hanime.json`;
        const res = await fetch(catalogUrl);
        if (res.ok) {
            const data = await res.json();
            console.log(`   ✅ Catalog loaded: ${data.metas?.length || 0} items`);
            if (data.metas?.[0]) {
                console.log(`   📺 First item: ${data.metas[0].name}`);
            }
        } else {
            console.log(`   ❌ HTTP ${res.status}: ${res.statusText}`);
        }
    } catch (err: any) {
        console.log(`   ❌ Error: ${err.message}`);
    }

    // Test 3: Streams (using a known ID)
    console.log('');
    console.log('3. Testing streams...');
    const testId = 'rape-gouhouka-1';
    try {
        const streamUrl = `${HANIME_API}/${encodedEmail}/${encodedPassword}/stream/movie/${testId}.json`;
        const res = await fetch(streamUrl);
        if (res.ok) {
            const data = await res.json();
            console.log(`   ✅ Streams loaded: ${data.streams?.length || 0} streams`);
            if (data.streams?.[0]) {
                console.log(`   🎬 First stream: ${data.streams[0].name || data.streams[0].title}`);
            }
        } else {
            console.log(`   ❌ HTTP ${res.status}: ${res.statusText}`);
        }
    } catch (err: any) {
        console.log(`   ❌ Error: ${err.message}`);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
}

testHanime();
