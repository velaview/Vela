import 'dotenv/config';
import fs from 'fs';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';

// Load environment
if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const TORBOX_API_KEY = process.env.TORBOX_API_KEY || '';
const TORBOX_API = 'https://api.torbox.app/v1/api';

// Known cached magnet (Shawshank Redemption 1080p)
const CACHED_HASH = 'c90cc4d4b294060851892e869755b71936c56149'; // Example hash
const CACHED_MAGNET = `magnet:?xt=urn:btih:${CACHED_HASH}&dn=The+Shawshank+Redemption`;

// Random uncached magnet
const UNCACHED_HASH = '0000000000000000000000000000000000000000';
const UNCACHED_MAGNET = `magnet:?xt=urn:btih:${UNCACHED_HASH}&dn=Fake+Uncached+Torrent`;

async function testAddOnlyIfCached() {
    console.log('═'.repeat(60));
    console.log('  TORBOX OPTIMIZATION TEST: add_only_if_cached');
    console.log('═'.repeat(60));

    if (!TORBOX_API_KEY) {
        console.error('❌ No API KEY');
        return;
    }

    // Test 1: Add Cached Torrent
    console.log('\n[1] Testing Cached Torrent...');
    const start1 = performance.now();
    try {
        const form = new FormData();
        form.append('magnet', CACHED_MAGNET);
        form.append('seed', '3');
        form.append('allow_zip', 'false');
        form.append('add_only_if_cached', 'true');

        const resp = await fetch(`${TORBOX_API}/torrents/createtorrent`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
            body: form,
        });

        const data = await resp.json();
        const latency = performance.now() - start1;

        if (resp.ok && data.success) {
            console.log(`  ✅ Success! Added cached torrent in ${Math.round(latency)}ms`);
            console.log(`     ID: ${data.data.torrent_id || data.data.id}`);
            console.log(`     Authored: ${data.data.auth_id}`);
        } else {
            console.log(`  ❌ Failed (Unexpected): ${JSON.stringify(data)}`);
        }
    } catch (e) {
        console.log(`  ❌ Error: ${e}`);
    }

    // Test 2: Add Uncached Torrent
    console.log('\n[2] Testing Uncached Torrent (Expect Failure)...');
    const start2 = performance.now();
    try {
        const form = new FormData();
        form.append('magnet', UNCACHED_MAGNET);
        form.append('seed', '3');
        form.append('allow_zip', 'false');
        form.append('add_only_if_cached', 'true');

        const resp = await fetch(`${TORBOX_API}/torrents/createtorrent`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
            body: form,
        });

        const data = await resp.json();
        const latency = performance.now() - start2;

        if (!data.success) {
            console.log(`  ✅ Success! Rejected uncached torrent in ${Math.round(latency)}ms`);
            console.log(`     Response: ${data.detail || data.error || 'Unknown error'}`);
        } else {
            console.log(`  ⚠️ Warning: Accepted uncached torrent? (Should not happen)`);
            console.log(JSON.stringify(data));
        }
    } catch (e) {
        console.log(`  ❌ Error: ${e}`);
    }
}

testAddOnlyIfCached().catch(console.error);
