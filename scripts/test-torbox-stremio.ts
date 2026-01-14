/**
 * Test TorBox Stremio Addon Stream Endpoint
 * This tests if TorBox's Stremio addon can search for streams
 * 
 * Run with: npx tsx scripts/test-torbox-stremio.ts
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TEST_IMDB = 'tt0111161'; // Shawshank Redemption
const TEST_SERIES = 'tt0944947'; // Game of Thrones

function getApiKey(): string {
    const apiKey = process.env.TORBOX_API_KEY_DEFAULT || process.env.TORBOX_API_KEY;
    if (!apiKey) throw new Error('No API key found');
    return apiKey;
}

async function testStremioEndpoint(name: string, url: string) {
    try {
        const response = await axios.get(url, { timeout: 15000 });
        console.log(`✅ ${name}`);
        console.log(`   URL: ${url}`);
        console.log(`   Streams: ${response.data?.streams?.length || 0}`);
        if (response.data?.streams?.length > 0) {
            const stream = response.data.streams[0];
            console.log(`   First: ${stream.title || stream.name || JSON.stringify(stream).substring(0, 100)}`);
        }
        console.log('');
        return response.data;
    } catch (error: any) {
        console.log(`❌ ${name}`);
        console.log(`   URL: ${url}`);
        console.log(`   Error: ${error.response?.status || error.message}`);
        console.log('');
        return null;
    }
}

async function main() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║         🎬 TorBox Stremio Addon Stream Test                      ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const apiKey = getApiKey();
    console.log(`API Key: ${apiKey.substring(0, 8)}...${apiKey.slice(-4)}`);
    console.log('\n');

    // Base URLs for TorBox Stremio addon
    const baseUrls = [
        'https://stremio.torbox.app',
        `https://stremio.torbox.app/${apiKey}`,
    ];

    console.log('━'.repeat(70));
    console.log('🔍 Testing Stremio Stream Endpoints');
    console.log('━'.repeat(70));
    console.log('');

    for (const base of baseUrls) {
        // Test movie stream
        await testStremioEndpoint(
            `Movie Stream (${base.includes(apiKey) ? 'with key' : 'no key'})`,
            `${base}/stream/movie/${TEST_IMDB}.json`
        );

        // Test series stream (with episode)
        await testStremioEndpoint(
            `Series Stream S1E1 (${base.includes(apiKey) ? 'with key' : 'no key'})`,
            `${base}/stream/series/${TEST_SERIES}:1:1.json`
        );
    }

    // Check if there's a search meta endpoint
    console.log('━'.repeat(70));
    console.log('🔍 Testing Stremio Meta/Catalog Endpoints');
    console.log('━'.repeat(70));
    console.log('');

    await testStremioEndpoint(
        'Catalog (user-movies)',
        `https://stremio.torbox.app/${apiKey}/catalog/movie/user-movies.json`
    );

    await testStremioEndpoint(
        'Meta (movie)',
        `https://stremio.torbox.app/${apiKey}/meta/movie/${TEST_IMDB}.json`
    );

    console.log('\n');
    console.log('═'.repeat(70));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(70));
    console.log('\nThe TorBox Stremio addon provides streams via:');
    console.log('  /stream/movie/{imdb}.json');
    console.log('  /stream/series/{imdb}:{season}:{episode}.json');
    console.log('\nThis can be used as an alternative to the REST API!\n');
}

main().catch(console.error);
