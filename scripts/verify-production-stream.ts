import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env FIRST
if (fs.existsSync('.env.local')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

// Dynamic import to ensure env is loaded
async function verify() {
    const { resolveStream } = await import('../src/core/streaming/resolver');

    console.log('--- Network Check ---');
    try {
        const url = 'https://torrentio.strem.fun/stream/movie/tt0111161.json';
        console.log(`Fetching ${url}...`);
        const res = await fetch(url);
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Size: ${text.length} bytes`);
    } catch (e) {
        console.error('Network check failed:', e);
    }
    console.log('--- End Network Check ---\n');

    const content = [
        { id: 'tt0111161', type: 'movie' as const, name: 'Shawshank Redemption' },
        { id: 'tt0944947', type: 'series' as const, season: 1, episode: 1, name: 'Game of Thrones S1E1' },
    ];

    console.log('Verifying Production Stream Resolver (Hybrid V2)...');

    for (const item of content) {
        console.log(`\nTesting ${item.name}...`);
        const start = Date.now();
        try {
            const result = await resolveStream({
                contentId: item.id,
                type: item.type,
                season: item.season,
                episode: item.episode,
                preferredQuality: '1080p'
            });
            const elapsed = Date.now() - start;

            if (result.streamUrl) {
                console.log(`✅ Success in ${elapsed}ms`);
                console.log(`   URL: ${result.streamUrl}`);
                console.log(`   Quality: ${result.stream.quality}`);
                console.log(`   Source: ${result.stream.source}`);
            } else {
                console.log(`❌ Failed: No URL returned`);
            }
        } catch (e) {
            console.error(`❌ Error verifying ${item.name}:`);
            if (e instanceof Error) {
                console.error(e.message);
                console.error(e.stack);
            } else {
                console.error(String(e));
            }
        }
    }
}

verify().catch(console.error);
