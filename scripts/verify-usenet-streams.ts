/**
 * Verify Usenet Streams in TorBox Stremio Response
 * Check if the 163+ streams include Usenet (NZB) streams
 * 
 * Run with: npx tsx scripts/verify-usenet-streams.ts
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TEST_IMDB = 'tt0111161'; // Shawshank Redemption

function getApiKey(): string {
    const apiKey = process.env.TORBOX_API_KEY_DEFAULT || process.env.TORBOX_API_KEY;
    if (!apiKey) throw new Error('No API key found');
    return apiKey;
}

async function main() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║         🔍 Verifying Usenet Streams in TorBox Response           ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const apiKey = getApiKey();
    const url = `https://stremio.torbox.app/${apiKey}/stream/movie/${TEST_IMDB}.json`;

    console.log(`Fetching: ${url.replace(apiKey, '***')}`);
    console.log('');

    try {
        const response = await axios.get(url, { timeout: 30000 });
        const streams = response.data?.streams || [];

        console.log(`Total streams: ${streams.length}`);
        console.log('');

        // Categorize streams
        const usenetStreams: any[] = [];
        const torrentStreams: any[] = [];
        const otherStreams: any[] = [];

        for (const stream of streams) {
            const title = (stream.title || stream.name || '').toLowerCase();
            const behaviorHints = stream.behaviorHints || {};
            const infoHash = stream.infoHash || behaviorHints.infoHash;
            const url = stream.url || behaviorHints.url || '';

            // Check for Usenet indicators
            const isUsenet =
                title.includes('usenet') ||
                title.includes('nzb') ||
                url.includes('.nzb') ||
                url.includes('usenet') ||
                stream.type === 'usenet' ||
                stream.source === 'usenet';

            // Check for torrent indicators
            const isTorrent = infoHash || url.includes('magnet:');

            if (isUsenet) {
                usenetStreams.push(stream);
            } else if (isTorrent) {
                torrentStreams.push(stream);
            } else {
                otherStreams.push(stream);
            }
        }

        console.log('━'.repeat(70));
        console.log('📊 STREAM BREAKDOWN');
        console.log('━'.repeat(70));
        console.log(`\n   Usenet streams: ${usenetStreams.length}`);
        console.log(`   Torrent streams: ${torrentStreams.length}`);
        console.log(`   Other streams: ${otherStreams.length}`);

        // Show sample of each type
        if (usenetStreams.length > 0) {
            console.log('\n');
            console.log('━'.repeat(70));
            console.log('📰 SAMPLE USENET STREAMS');
            console.log('━'.repeat(70));
            usenetStreams.slice(0, 3).forEach((s, i) => {
                console.log(`\n[${i + 1}] ${s.title || s.name}`);
                console.log(`    URL: ${(s.url || s.behaviorHints?.url || 'N/A').substring(0, 80)}...`);
            });
        }

        if (torrentStreams.length > 0) {
            console.log('\n');
            console.log('━'.repeat(70));
            console.log('🧲 SAMPLE TORRENT STREAMS');
            console.log('━'.repeat(70));
            torrentStreams.slice(0, 3).forEach((s, i) => {
                console.log(`\n[${i + 1}] ${s.title || s.name}`);
                console.log(`    InfoHash: ${s.infoHash || s.behaviorHints?.infoHash || 'N/A'}`);
            });
        }

        // Check stream structure
        console.log('\n');
        console.log('━'.repeat(70));
        console.log('🔬 RAW STREAM STRUCTURE (first 3)');
        console.log('━'.repeat(70));
        streams.slice(0, 3).forEach((s: any, i: number) => {
            console.log(`\n[${i + 1}] ${JSON.stringify(s, null, 2).substring(0, 500)}...`);
        });

        // Check for any stream with NZB or usenet-like URLs
        console.log('\n');
        console.log('━'.repeat(70));
        console.log('🔍 DEEP SCAN FOR NZB/USENET INDICATORS');
        console.log('━'.repeat(70));

        const nzbIndicators = ['nzb', 'usenet', 'newsgroup', 'nntp'];
        let foundNzb = false;
        for (const stream of streams) {
            const allText = JSON.stringify(stream).toLowerCase();
            for (const indicator of nzbIndicators) {
                if (allText.includes(indicator)) {
                    if (!foundNzb) {
                        console.log('\n✅ Found streams with NZB/Usenet indicators:');
                    }
                    foundNzb = true;
                    console.log(`   - "${stream.title?.substring(0, 60)}..." contains "${indicator}"`);
                    break;
                }
            }
        }

        if (!foundNzb) {
            console.log('\n❌ No explicit NZB/Usenet indicators found in stream data.');
            console.log('   TorBox may be handling Usenet transparently (pre-resolved).');
            console.log('   The streams might be HLS URLs that TorBox already prepared from NZB.');
        }

        console.log('\n');

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

main().catch(console.error);
