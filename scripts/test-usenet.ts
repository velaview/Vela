/**
 * Comprehensive Usenet Test Script
 * Tests all TorBox Usenet-related API functionality
 * 
 * Run with: npx ts-node --skip-project scripts/test-usenet.ts
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const TORBOX_API_BASE = 'https://api.torbox.app/v1';
const TEST_IMDB_ID = 'tt0111161'; // The Shawshank Redemption
const TEST_MOVIE_TITLE = 'The Shawshank Redemption';
const TEST_MOVIE_YEAR = 1994;

interface TestResult {
    name: string;
    passed: boolean;
    message: string;
    data?: unknown;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getApiKey(): string {
    const apiKey = process.env.TORBOX_API_KEY_DEFAULT || process.env.TORBOX_API_KEY;
    if (!apiKey) {
        throw new Error('TorBox API key not configured. Set TORBOX_API_KEY or TORBOX_API_KEY_DEFAULT in .env.local');
    }
    return apiKey;
}

function formatResult(result: TestResult): string {
    const icon = result.passed ? '✅' : '❌';
    return `${icon} ${result.name}: ${result.message}`;
}

// ─────────────────────────────────────────────────────────────
// Test Functions
// ─────────────────────────────────────────────────────────────

async function testApiKeyValid(apiKey: string): Promise<TestResult> {
    try {
        const response = await axios.get(`${TORBOX_API_BASE}/api/user/me`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 10000,
        });

        const user = response.data.data;
        return {
            name: 'API Key Validation',
            passed: true,
            message: `Valid! Plan: ${user?.plan || 'Unknown'}, Email: ${user?.email || 'N/A'}`,
            data: user,
        };
    } catch (error: any) {
        return {
            name: 'API Key Validation',
            passed: false,
            message: `Invalid or expired: ${error.response?.status || error.message}`,
        };
    }
}

async function testUnifiedSearchEndpoint(apiKey: string): Promise<TestResult> {
    try {
        // Test the unified /api/search endpoint (this should work)
        const response = await axios.get(`${TORBOX_API_BASE}/api/search`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            params: {
                imdb_id: TEST_IMDB_ID,
                limit: 5,
            },
            timeout: 30000,
        });

        const torrents = response.data.data?.torrents || [];
        const usenet = response.data.data?.usenet || [];

        return {
            name: 'Unified Search (/api/search)',
            passed: response.data.success === true,
            message: `Found ${torrents.length} torrents, ${usenet.length} Usenet results`,
            data: { torrents: torrents.slice(0, 2), usenet: usenet.slice(0, 2) },
        };
    } catch (error: any) {
        return {
            name: 'Unified Search (/api/search)',
            passed: false,
            message: `Error: ${error.response?.status} - ${error.response?.data?.detail || error.message}`,
        };
    }
}

async function testUsenetSearchEndpoint(apiKey: string): Promise<TestResult> {
    try {
        // Test the /api/search/usenet endpoint (this is what the code currently uses)
        const response = await axios.get(`${TORBOX_API_BASE}/api/search/usenet`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            params: {
                imdb_id: TEST_IMDB_ID,
                limit: 5,
            },
            timeout: 30000,
        });

        const usenet = response.data.data?.usenet || response.data.data || [];

        return {
            name: 'Usenet-Only Search (/api/search/usenet)',
            passed: true,
            message: `Endpoint exists! Found ${Array.isArray(usenet) ? usenet.length : 0} results`,
            data: usenet,
        };
    } catch (error: any) {
        const is404 = error.response?.status === 404;
        return {
            name: 'Usenet-Only Search (/api/search/usenet)',
            passed: false,
            message: is404
                ? '404 Not Found - This endpoint does NOT exist (use /api/search instead)'
                : `Error: ${error.response?.status} - ${error.response?.data?.detail || error.message}`,
        };
    }
}

async function testTorrentSearchEndpoint(apiKey: string): Promise<TestResult> {
    try {
        // Test the /api/search/torrents endpoint
        const response = await axios.get(`${TORBOX_API_BASE}/api/search/torrents`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            params: {
                imdb_id: TEST_IMDB_ID,
                limit: 5,
            },
            timeout: 30000,
        });

        const torrents = response.data.data?.torrents || response.data.data || [];

        return {
            name: 'Torrent-Only Search (/api/search/torrents)',
            passed: true,
            message: `Endpoint exists! Found ${Array.isArray(torrents) ? torrents.length : 0} results`,
            data: torrents,
        };
    } catch (error: any) {
        const is404 = error.response?.status === 404;
        return {
            name: 'Torrent-Only Search (/api/search/torrents)',
            passed: false,
            message: is404
                ? '404 Not Found - This endpoint does NOT exist'
                : `Error: ${error.response?.status} - ${error.response?.data?.detail || error.message}`,
        };
    }
}

async function testSearchByQuery(apiKey: string): Promise<TestResult> {
    try {
        // Test search by query (title + year) - for Usenet this is often required
        const query = `${TEST_MOVIE_TITLE} ${TEST_MOVIE_YEAR}`;
        const response = await axios.get(`${TORBOX_API_BASE}/api/search`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            params: {
                q: query,
                limit: 5,
            },
            timeout: 30000,
        });

        const torrents = response.data.data?.torrents || [];
        const usenet = response.data.data?.usenet || [];

        return {
            name: 'Search by Query (title+year)',
            passed: response.data.success === true,
            message: `Query: "${query}" → ${torrents.length} torrents, ${usenet.length} Usenet`,
            data: { query, torrents: torrents.length, usenet: usenet.length },
        };
    } catch (error: any) {
        return {
            name: 'Search by Query (title+year)',
            passed: false,
            message: `Error: ${error.response?.status} - ${error.response?.data?.detail || error.message}`,
        };
    }
}

async function testUsenetMyList(apiKey: string): Promise<TestResult> {
    try {
        // Test getting the Usenet downloads list
        const response = await axios.get(`${TORBOX_API_BASE}/api/usenet/mylist`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: 10000,
        });

        const downloads = response.data.data || [];

        return {
            name: 'Usenet Downloads List (/api/usenet/mylist)',
            passed: response.data.success === true,
            message: `Found ${Array.isArray(downloads) ? downloads.length : 0} Usenet downloads in your account`,
            data: Array.isArray(downloads) ? downloads.slice(0, 3) : downloads,
        };
    } catch (error: any) {
        return {
            name: 'Usenet Downloads List (/api/usenet/mylist)',
            passed: false,
            message: `Error: ${error.response?.status} - ${error.response?.data?.detail || error.message}`,
        };
    }
}

async function testUsenetCacheCheck(apiKey: string): Promise<TestResult> {
    try {
        // Check if there's a Usenet cache check endpoint
        const response = await axios.get(`${TORBOX_API_BASE}/api/usenet/checkcached`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            params: { hash: 'test' },
            timeout: 10000,
        });

        return {
            name: 'Usenet Cache Check (/api/usenet/checkcached)',
            passed: true,
            message: 'Endpoint exists!',
            data: response.data,
        };
    } catch (error: any) {
        const is404 = error.response?.status === 404;
        return {
            name: 'Usenet Cache Check (/api/usenet/checkcached)',
            passed: false,
            message: is404
                ? '404 Not Found - Usenet cache checking not available'
                : `Error: ${error.response?.status} - ${error.response?.data?.detail || error.message}`,
        };
    }
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║          🔬 TorBox Usenet API Comprehensive Test               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Get API key
    let apiKey: string;
    try {
        apiKey = getApiKey();
        console.log(`📍 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
        console.log(`📍 Test content: ${TEST_MOVIE_TITLE} (${TEST_MOVIE_YEAR}) - ${TEST_IMDB_ID}`);
        console.log('\n');
    } catch (error: any) {
        console.error('❌ ' + error.message);
        process.exit(1);
    }

    // Run all tests
    const results: TestResult[] = [];

    console.log('─'.repeat(60));
    console.log('🔐 Authentication');
    console.log('─'.repeat(60));
    results.push(await testApiKeyValid(apiKey));
    console.log(formatResult(results[results.length - 1]));

    console.log('\n');
    console.log('─'.repeat(60));
    console.log('🔍 Search API Endpoints');
    console.log('─'.repeat(60));

    results.push(await testUnifiedSearchEndpoint(apiKey));
    console.log(formatResult(results[results.length - 1]));

    results.push(await testUsenetSearchEndpoint(apiKey));
    console.log(formatResult(results[results.length - 1]));

    results.push(await testTorrentSearchEndpoint(apiKey));
    console.log(formatResult(results[results.length - 1]));

    results.push(await testSearchByQuery(apiKey));
    console.log(formatResult(results[results.length - 1]));

    console.log('\n');
    console.log('─'.repeat(60));
    console.log('📦 Usenet Management APIs');
    console.log('─'.repeat(60));

    results.push(await testUsenetMyList(apiKey));
    console.log(formatResult(results[results.length - 1]));

    results.push(await testUsenetCacheCheck(apiKey));
    console.log(formatResult(results[results.length - 1]));

    // Summary
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`\n   Passed: ${passed}/${results.length}`);
    console.log(`   Failed: ${failed}/${results.length}`);

    if (failed > 0) {
        console.log('\n🔴 Failed Tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   • ${r.name}: ${r.message}`);
        });
    }

    // Recommendations
    console.log('\n');
    console.log('─'.repeat(60));
    console.log('💡 RECOMMENDATIONS');
    console.log('─'.repeat(60));

    const unifiedWorked = results.find(r => r.name.includes('Unified'))?.passed;
    const usenetEndpointFailed = results.find(r => r.name.includes('Usenet-Only'))?.passed === false;

    if (unifiedWorked && usenetEndpointFailed) {
        console.log('\n⚠️  /api/search/usenet does NOT exist!');
        console.log('   Use /api/search instead - it returns BOTH torrents AND usenet.');
        console.log('   The code in client.ts needs to be fixed to use the unified endpoint.');
    }

    const usenetListResult = results.find(r => r.name.includes('Usenet Downloads'));
    if (usenetListResult?.passed && usenetListResult.data) {
        const count = Array.isArray(usenetListResult.data) ? usenetListResult.data.length : 0;
        if (count > 0) {
            console.log(`\n✅ You have ${count} Usenet downloads - Usenet is working on your account!`);
        }
    }

    console.log('\n');
}

main().catch(console.error);
