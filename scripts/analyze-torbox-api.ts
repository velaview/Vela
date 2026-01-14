/**
 * Deep TorBox API Endpoint Analysis
 * Systematically tests all known and potential endpoints
 * 
 * Run with: npx tsx scripts/analyze-torbox-api.ts
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TORBOX_API_BASE = 'https://api.torbox.app/v1';
const TEST_IMDB = 'tt0111161';
const TEST_HASH = 'cb670c813bd16f40e79477005e709e056583fb46'; // Big Buck Bunny

interface EndpointTest {
    name: string;
    method: 'GET' | 'POST';
    path: string;
    params?: Record<string, string>;
    body?: Record<string, unknown>;
}

function getApiKey(): string {
    const apiKey = process.env.TORBOX_API_KEY_DEFAULT || process.env.TORBOX_API_KEY;
    if (!apiKey) throw new Error('No API key found');
    return apiKey;
}

async function testEndpoint(apiKey: string, test: EndpointTest): Promise<void> {
    const url = `${TORBOX_API_BASE}${test.path}`;

    try {
        const config = {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 15000,
            params: test.params,
        };

        let response;
        if (test.method === 'GET') {
            response = await axios.get(url, config);
        } else {
            response = await axios.post(url, test.body, config);
        }

        const dataPreview = JSON.stringify(response.data).substring(0, 200);
        console.log(`✅ ${test.name}`);
        console.log(`   ${test.method} ${test.path}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Data: ${dataPreview}...`);
        console.log('');
    } catch (error: any) {
        const status = error.response?.status || 'N/A';
        const detail = error.response?.data?.detail || error.response?.data?.error || error.message;
        console.log(`❌ ${test.name}`);
        console.log(`   ${test.method} ${test.path}`);
        console.log(`   Status: ${status}`);
        console.log(`   Error: ${detail}`);
        console.log('');
    }
}

async function main() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║         🔬 TorBox API Deep Endpoint Analysis                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const apiKey = getApiKey();
    console.log(`API Key: ${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`);
    console.log('');

    // ─────────────────────────────────────────────────────────────
    // Test 1: User/Account Info
    // ─────────────────────────────────────────────────────────────
    console.log('━'.repeat(70));
    console.log('👤 USER/ACCOUNT ENDPOINTS');
    console.log('━'.repeat(70));
    console.log('');

    await testEndpoint(apiKey, {
        name: 'User Info',
        method: 'GET',
        path: '/api/user/me',
    });

    // ─────────────────────────────────────────────────────────────
    // Test 2: Search Endpoints (Multiple Variations)
    // ─────────────────────────────────────────────────────────────
    console.log('━'.repeat(70));
    console.log('🔍 SEARCH ENDPOINTS (Testing Multiple Paths)');
    console.log('━'.repeat(70));
    console.log('');

    // Try various search endpoint patterns
    const searchEndpoints: EndpointTest[] = [
        // Documented paths
        { name: 'Search (unified)', method: 'GET', path: '/api/search', params: { imdb_id: TEST_IMDB } },
        { name: 'Search Torrents', method: 'GET', path: '/api/search/torrents', params: { imdb_id: TEST_IMDB } },
        { name: 'Search Usenet', method: 'GET', path: '/api/search/usenet', params: { imdb_id: TEST_IMDB } },

        // Alternative paths (Voyager)
        { name: 'Voyager Search', method: 'GET', path: '/api/voyager/search', params: { imdb_id: TEST_IMDB } },
        { name: 'Voyager Torrents', method: 'GET', path: '/api/voyager/torrents', params: { imdb_id: TEST_IMDB } },
        { name: 'Voyager Usenet', method: 'GET', path: '/api/voyager/usenet', params: { imdb_id: TEST_IMDB } },

        // Query-based search
        { name: 'Search with q param', method: 'GET', path: '/api/search', params: { q: 'Shawshank Redemption' } },
        { name: 'Search with query param', method: 'GET', path: '/api/search', params: { query: 'Shawshank Redemption' } },

        // Torrents search variations
        { name: 'Torrents Search (plural)', method: 'GET', path: '/api/torrents/search', params: { imdb_id: TEST_IMDB } },
        { name: 'Torrent Search (singular)', method: 'GET', path: '/api/torrent/search', params: { imdb_id: TEST_IMDB } },

        // Usenet search variations
        { name: 'Usenet Search (under usenet)', method: 'GET', path: '/api/usenet/search', params: { imdb_id: TEST_IMDB } },
        { name: 'Usenet Search with query', method: 'GET', path: '/api/usenet/search', params: { q: 'Shawshank Redemption' } },
    ];

    for (const endpoint of searchEndpoints) {
        await testEndpoint(apiKey, endpoint);
    }

    // ─────────────────────────────────────────────────────────────
    // Test 3: Torrent Management
    // ─────────────────────────────────────────────────────────────
    console.log('━'.repeat(70));
    console.log('📦 TORRENT MANAGEMENT ENDPOINTS');
    console.log('━'.repeat(70));
    console.log('');

    await testEndpoint(apiKey, {
        name: 'My Torrents List',
        method: 'GET',
        path: '/api/torrents/mylist',
    });

    await testEndpoint(apiKey, {
        name: 'Check Torrent Cache',
        method: 'GET',
        path: '/api/torrents/checkcached',
        params: { hash: TEST_HASH, format: 'list' },
    });

    // ─────────────────────────────────────────────────────────────
    // Test 4: Usenet Management
    // ─────────────────────────────────────────────────────────────
    console.log('━'.repeat(70));
    console.log('📰 USENET MANAGEMENT ENDPOINTS');
    console.log('━'.repeat(70));
    console.log('');

    await testEndpoint(apiKey, {
        name: 'My Usenet List',
        method: 'GET',
        path: '/api/usenet/mylist',
    });

    await testEndpoint(apiKey, {
        name: 'Usenet Check Cached',
        method: 'GET',
        path: '/api/usenet/checkcached',
        params: { hash: 'test' },
    });

    // ─────────────────────────────────────────────────────────────
    // Test 5: WebDL (if available)
    // ─────────────────────────────────────────────────────────────
    console.log('━'.repeat(70));
    console.log('🌐 WEBDL ENDPOINTS');
    console.log('━'.repeat(70));
    console.log('');

    await testEndpoint(apiKey, {
        name: 'WebDL List',
        method: 'GET',
        path: '/api/webdl/mylist',
    });

    // ─────────────────────────────────────────────────────────────
    // Test 6: Stream Endpoints
    // ─────────────────────────────────────────────────────────────
    console.log('━'.repeat(70));
    console.log('🎬 STREAM ENDPOINTS');
    console.log('━'.repeat(70));
    console.log('');

    await testEndpoint(apiKey, {
        name: 'Stream Info (no params)',
        method: 'GET',
        path: '/api/stream',
    });

    // ─────────────────────────────────────────────────────────────
    // Test 7: API Root Discovery
    // ─────────────────────────────────────────────────────────────
    console.log('━'.repeat(70));
    console.log('📋 API ROOT / DISCOVERY');
    console.log('━'.repeat(70));
    console.log('');

    await testEndpoint(apiKey, {
        name: 'API Root',
        method: 'GET',
        path: '/api',
    });

    await testEndpoint(apiKey, {
        name: 'API v1 Root',
        method: 'GET',
        path: '/',
    });

    // ─────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('📊 ANALYSIS COMPLETE');
    console.log('═'.repeat(70));
    console.log('\nCheck above for which endpoints returned ✅ vs ❌');
    console.log('Working endpoints can be used for Usenet integration.\n');
}

main().catch(console.error);
