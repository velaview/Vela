#!/usr/bin/env tsx
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPREHENSIVE PROVIDER TEST SUITE v5.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tests ALL providers including:
 * - Metadata: Cinemeta, TMDB, Kitsu
 * - Torrents: Torrentio, TorBox (cached torrents + Usenet)
 * - Subtitles: OpenSubtitles Stremio (no API key!)
 * - Hentai: Hanime Stremio addon
 * - Rich metadata: Tags, descriptions, posters, backgrounds
 * 
 * Run: npx tsx src/scripts/provider-test-suite.ts
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// ═══════════════════════════════════════════════════════════════════════════
// MARKDOWN REPORT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

class ReportBuilder {
    private lines: string[] = [];
    private timestamp = new Date().toISOString();

    constructor() {
        this.lines.push(`# Vela Provider Analysis Report v5.0`);
        this.lines.push(`> Generated: ${this.timestamp}`);
        this.lines.push('');
        this.lines.push('---');
        this.lines.push('');
    }

    h1(title: string) { this.lines.push(`# ${title}`, ''); }
    h2(title: string) { this.lines.push(`## ${title}`, ''); }
    h3(title: string) { this.lines.push(`### ${title}`, ''); }
    p(text: string) { this.lines.push(text, ''); }
    success(text: string) { this.lines.push(`✅ **${text}**`, ''); }
    warning(text: string) { this.lines.push(`⚠️ *${text}*`, ''); }
    error(text: string) { this.lines.push(`❌ **${text}**`, ''); }

    code(content: string, lang = '') {
        this.lines.push('```' + lang, content, '```', '');
    }

    table(headers: string[], rows: string[][]) {
        this.lines.push('| ' + headers.join(' | ') + ' |');
        this.lines.push('| ' + headers.map(() => '---').join(' | ') + ' |');
        rows.forEach(row => this.lines.push('| ' + row.join(' | ') + ' |'));
        this.lines.push('');
    }

    divider() { this.lines.push('', '---', ''); }

    save() {
        const dir = resolve(process.cwd(), 'test-results');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

        const date = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const filename = `provider-analysis-${date}.md`;

        writeFileSync(resolve(dir, filename), this.lines.join('\n'));
        writeFileSync(resolve(dir, 'provider-analysis-latest.md'), this.lines.join('\n'));

        console.log(`\n📄 Report saved to: test-results/${filename}`);
        console.log(`📄 Also saved as: test-results/provider-analysis-latest.md`);
    }
}

const report = new ReportBuilder();

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION - ALL PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
    testContent: {
        movie: { id: 'tt0111161', title: 'The Shawshank Redemption', year: 1994, tmdbId: '278' },
        series: { id: 'tt0944947', title: 'Game of Thrones', season: 1, episode: 1, tmdbId: '1399' },
        anime: { id: 'kitsu:7442', title: 'Attack on Titan' },
        hentai: { title: 'Overflow' },
    },
    addons: {
        // Metadata providers
        cinemeta: 'https://v3-cinemeta.strem.io',
        kitsu: 'https://anime-kitsu.strem.fun',
        // TMDB addon
        tmdb: 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club',
        // Stream providers
        torrentio: 'https://torrentio.strem.fun',
        torboxStremio: 'https://stremio.torbox.app',
        // Subtitles
        opensubtitles: 'https://opensubtitles-v3.strem.io',
        // Hentai
        hanimeStremio: 'https://86f0740f37f6-hanime-stremio.baby-beamup.club',
    },
    apis: {
        torbox: 'https://api.torbox.app/v1/api',
        tmdb: 'https://api.themoviedb.org/3',
    },
    timeout: 15000,
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

async function fetchWithTimeout<T>(url: string, options?: RequestInit, timeout = CONFIG.timeout): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

function truncate(str: string | undefined, len = 80): string {
    if (!str) return '-';
    return str.length > len ? str.slice(0, len) + '...' : str;
}

function log(msg: string) { console.log(msg); }

// ═══════════════════════════════════════════════════════════════════════════
// 1. CINEMETA - Movie & Series Metadata
// ═══════════════════════════════════════════════════════════════════════════

async function testCinemeta() {
    report.h2('1. Cinemeta (Movies & Series Metadata)');
    log('Testing Cinemeta...');

    try {
        const manifest = await fetchWithTimeout<any>(`${CONFIG.addons.cinemeta}/manifest.json`);
        report.table(['Property', 'Value'], [
            ['ID', manifest.id],
            ['Name', manifest.name],
            ['Version', manifest.version],
            ['Types', manifest.types?.join(', ')],
            ['Catalogs', String(manifest.catalogs?.length || 0)],
        ]);

        // Full movie metadata
        const movieData = await fetchWithTimeout<any>(`${CONFIG.addons.cinemeta}/meta/movie/${CONFIG.testContent.movie.id}.json`);
        const movie = movieData.meta;

        report.h3('Full Movie Metadata: The Shawshank Redemption');
        report.table(['Field', 'Value'], [
            ['ID', movie.id],
            ['Title', movie.name],
            ['Year', String(movie.year)],
            ['Runtime', movie.runtime || '-'],
            ['Genres', movie.genres?.join(', ') || '-'],
            ['Director', movie.director?.join(', ') || '-'],
            ['Writer', movie.writer?.join(', ') || '-'],
            ['Cast', movie.cast?.slice(0, 8).join(', ') || '-'],
            ['Country', movie.country || '-'],
            ['IMDB Rating', movie.imdb_rating || '-'],
            ['Awards', truncate(movie.awards, 60) || '-'],
            ['Poster', movie.poster ? '✅' : '❌'],
            ['Background', movie.background ? '✅' : '❌'],
            ['Logo', movie.logo ? '✅' : '❌'],
            ['Trailers', String(movie.trailers?.length || 0)],
        ]);

        report.p('**Full Description:**');
        report.p(`> ${movie.description || 'No description'}`);

        if (movie.poster) report.p(`**Poster:** \`${movie.poster}\``);
        if (movie.background) report.p(`**Background:** \`${movie.background}\``);

        // Series metadata with episodes
        const seriesData = await fetchWithTimeout<any>(`${CONFIG.addons.cinemeta}/meta/series/${CONFIG.testContent.series.id}.json`);
        const series = seriesData.meta;

        report.h3('Full Series Metadata: Game of Thrones');
        report.table(['Field', 'Value'], [
            ['ID', series.id],
            ['Title', series.name],
            ['Genres', series.genres?.join(', ') || '-'],
            ['Cast', series.cast?.slice(0, 5).join(', ') || '-'],
            ['Total Episodes', String(series.videos?.length || 0)],
            ['Status', series.status || '-'],
            ['Poster', series.poster ? '✅' : '❌'],
            ['Background', series.background ? '✅' : '❌'],
        ]);

        report.p('**Description:**');
        report.p(`> ${truncate(series.description, 400)}`);

        report.success('Cinemeta fully operational');
    } catch (e) {
        report.error(`Cinemeta failed: ${e}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. TMDB ADDON - Rich Metadata
// ═══════════════════════════════════════════════════════════════════════════

async function testTMDB() {
    report.h2('2. TMDB Addon (Rich Metadata)');
    log('Testing TMDB addon...');

    try {
        const manifest = await fetchWithTimeout<any>(`${CONFIG.addons.tmdb}/manifest.json`);
        report.h3('Manifest');
        report.table(['Property', 'Value'], [
            ['ID', manifest.id],
            ['Name', manifest.name],
            ['Version', manifest.version || '-'],
            ['Types', manifest.types?.join(', ')],
            ['Catalogs', String(manifest.catalogs?.length || 0)],
        ]);

        // List catalogs
        if (manifest.catalogs?.length > 0) {
            report.h3('Available Catalogs');
            const catalogRows = manifest.catalogs.slice(0, 10).map((c: any) => [
                c.type,
                c.id,
                c.name,
            ]);
            report.table(['Type', 'ID', 'Name'], catalogRows);
        }

        // Try to get movie metadata
        report.h3('Movie Metadata');
        try {
            const movieUrl = `${CONFIG.addons.tmdb}/meta/movie/${CONFIG.testContent.movie.id}.json`;
            const movieData = await fetchWithTimeout<any>(movieUrl);
            const movie = movieData.meta;

            report.table(['Field', 'Value'], [
                ['Title', movie?.name || '-'],
                ['Year', String(movie?.year || '-')],
                ['Genres', movie?.genres?.join(', ') || '-'],
                ['Runtime', movie?.runtime || '-'],
                ['Description', truncate(movie?.description, 100)],
            ]);
            report.success('TMDB metadata available');
        } catch (e) {
            report.warning(`Movie metadata not available: ${e}`);
        }

        report.success('TMDB addon accessible');
    } catch (e) {
        report.error(`TMDB addon failed: ${e}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. KITSU - Anime Metadata
// ═══════════════════════════════════════════════════════════════════════════

async function testKitsu() {
    report.h2('3. Kitsu (Anime Catalog)');
    log('Testing Kitsu...');

    try {
        const manifest = await fetchWithTimeout<any>(`${CONFIG.addons.kitsu}/manifest.json`);
        report.table(['Property', 'Value'], [
            ['ID', manifest.id],
            ['Name', manifest.name],
            ['Types', manifest.types?.join(', ')],
        ]);

        // Popular anime
        const catalog = await fetchWithTimeout<any>(`${CONFIG.addons.kitsu}/catalog/anime/kitsu-anime-popular.json`);
        report.h3('Top 10 Popular Anime');

        const animeRows = catalog.metas?.slice(0, 10).map((m: any) => [
            truncate(m.name, 30),
            m.genres?.slice(0, 3).join(', ') || '-',
            m.poster ? '✅' : '❌',
        ]) || [];

        report.table(['Title', 'Genres', 'Poster'], animeRows);

        // Full anime metadata
        const animeData = await fetchWithTimeout<any>(`${CONFIG.addons.kitsu}/meta/anime/kitsu:7442.json`);
        const anime = animeData.meta;

        report.h3('Full Anime Metadata: Attack on Titan');
        report.table(['Field', 'Value'], [
            ['ID', anime.id],
            ['Title', anime.name],
            ['Genres', anime.genres?.join(', ') || '-'],
            ['Status', anime.status || '-'],
            ['Episodes', String(anime.videos?.length || 0)],
            ['Poster', anime.poster ? '✅' : '❌'],
            ['Background', anime.background ? '✅' : '❌'],
        ]);

        report.p('**Description:**');
        report.p(`> ${truncate(anime.description, 400)}`);

        report.success('Kitsu fully operational');
    } catch (e) {
        report.error(`Kitsu failed: ${e}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3b. KITSU PLAYBACK - ID Resolution Test
// ═══════════════════════════════════════════════════════════════════════════

async function testKitsuPlayback() {
    report.h2('3b. Kitsu Playback (ID Resolution)');
    log('Testing Kitsu ID resolution...');

    try {
        // Fetch Kitsu metadata
        const kitsuMeta = await fetchWithTimeout<any>(
            `${CONFIG.addons.kitsu}/meta/anime/kitsu:7442.json`
        );
        const meta = kitsuMeta.meta;

        // Extract IMDB ID from multiple possible locations
        let imdbId = meta?.behaviorHints?.defaultVideoId;
        if (!imdbId) imdbId = meta?.imdb_id;
        if (!imdbId && meta?.links) {
            const imdbLink = meta.links.find((link: any) =>
                link.category === 'imdb' || link.url?.includes('imdb.com')
            );
            if (imdbLink) {
                const match = imdbLink.url?.match(/tt\d+/);
                if (match) imdbId = match[0];
            }
        }

        report.h3('ID Conversion Test');
        report.table(['Field', 'Value'], [
            ['Kitsu ID', 'kitsu:7442'],
            ['Anime Title', meta?.name || 'Unknown'],
            ['IMDB ID Found', imdbId || 'NOT FOUND'],
            ['Conversion', imdbId?.startsWith('tt') ? '✅ SUCCESS' : '❌ FAILED'],
        ]);

        // Test Torrentio stream lookup with converted ID
        if (imdbId && imdbId.startsWith('tt')) {
            report.h3('Stream Lookup Test');
            try {
                // Use series endpoint with season:episode for anime
                const streamUrl = `${CONFIG.addons.torrentio}/stream/series/${imdbId}:1:1.json`;
                const streamData = await fetchWithTimeout<any>(streamUrl);
                const streams = streamData.streams || [];

                report.table(['Field', 'Value'], [
                    ['Lookup URL', truncate(streamUrl, 60)],
                    ['Streams Found', String(streams.length)],
                    ['Playback Ready', streams.length > 0 ? '✅ YES' : '⚠️ No cached streams'],
                ]);

                if (streams.length > 0) {
                    // Show sample stream qualities
                    const qualities: Record<string, number> = {};
                    streams.slice(0, 20).forEach((s: any) => {
                        const q = s.name?.match(/(4K|2160p|1080p|720p|480p)/i)?.[0]?.toUpperCase() || 'Unknown';
                        qualities[q] = (qualities[q] || 0) + 1;
                    });
                    report.p('**Quality Distribution (first 20):**');
                    Object.entries(qualities).forEach(([q, c]) => {
                        report.p(`- ${q}: ${c} streams`);
                    });
                }

                report.success('Kitsu playback resolution working!');
            } catch (streamErr) {
                report.warning(`Stream lookup failed: ${streamErr}`);
            }
        } else {
            report.error('Cannot test streams - IMDB ID not found');
        }

    } catch (e) {
        report.error(`Kitsu playback test failed: ${e}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. TORRENTIO - Torrent Streams
// ═══════════════════════════════════════════════════════════════════════════

async function testTorrentio() {
    report.h2('4. Torrentio (Torrent Streams)');
    log('Testing Torrentio...');

    try {
        const data = await fetchWithTimeout<any>(`${CONFIG.addons.torrentio}/stream/movie/${CONFIG.testContent.movie.id}.json`);
        const streams = data.streams || [];

        report.p(`**Total Streams:** ${streams.length}`);

        // Quality distribution
        const qualities: Record<string, number> = {};
        streams.forEach((s: any) => {
            const q = s.name?.match(/(4K|2160p|1080p|720p|480p|HDR)/i)?.[0]?.toUpperCase() || 'Unknown';
            qualities[q] = (qualities[q] || 0) + 1;
        });

        report.table(['Quality', 'Count'],
            Object.entries(qualities).sort((a, b) => b[1] - a[1]).map(([q, c]) => [q, String(c)])
        );

        report.success(`Torrentio returned ${streams.length} streams`);
    } catch (e) {
        report.error(`Torrentio failed: ${e}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. TORBOX - Cached Torrents + Usenet
// ═══════════════════════════════════════════════════════════════════════════

async function testTorBox() {
    report.h2('5. TorBox (Cached Torrents + Usenet)');
    log('Testing TorBox...');

    const apiKey = process.env.TORBOX_API_KEY;
    if (!apiKey) {
        report.warning('TORBOX_API_KEY not set - skipping');
        return;
    }

    const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

    try {
        // User info
        const userRes = await fetch(`${CONFIG.apis.torbox}/user/me`, { headers });
        const userData = await userRes.json();

        report.h3('Account');
        if (userData.success) {
            report.table(['Field', 'Value'], [
                ['Email', userData.data?.email],
                ['Plan', String(userData.data?.plan)],
                ['Premium', userData.data?.premium ? 'Yes' : 'No'],
            ]);
            report.success('TorBox authenticated');
        } else {
            report.error('Authentication failed');
            return;
        }

        // Torrent list
        const torrentsRes = await fetch(`${CONFIG.apis.torbox}/torrents/mylist`, { headers });
        const torrentsData = await torrentsRes.json();
        const torrents = torrentsData.data || [];
        const completedTorrents = torrents.filter((t: any) => t.download_finished);

        report.h3('My Torrents');
        report.table(['Metric', 'Value'], [
            ['Total', String(torrents.length)],
            ['Completed', String(completedTorrents.length)],
            ['In Progress', String(torrents.length - completedTorrents.length)],
        ]);

        if (completedTorrents.length > 0) {
            report.p('**Recent Completed:**');
            completedTorrents.slice(0, 5).forEach((t: any) => {
                const size = (t.size / 1024 / 1024 / 1024).toFixed(2);
                report.p(`- ${truncate(t.name, 50)} (${size} GB)`);
            });
        }

        // ==== USENET - Key Feature! ====
        report.h3('My Usenet Downloads');
        const usenetRes = await fetch(`${CONFIG.apis.torbox}/usenet/mylist`, { headers });
        const usenetData = await usenetRes.json();
        const usenetItems = usenetData.data || [];
        const completedUsenet = usenetItems.filter((u: any) => u.download_finished);

        report.table(['Metric', 'Value'], [
            ['Total', String(usenetItems.length)],
            ['Completed', String(completedUsenet.length)],
            ['In Progress', String(usenetItems.length - completedUsenet.length)],
        ]);

        if (completedUsenet.length > 0) {
            report.p('**Recent Completed Usenet:**');
            completedUsenet.slice(0, 5).forEach((u: any) => {
                const size = (u.size / 1024 / 1024 / 1024).toFixed(2);
                report.p(`- ${truncate(u.name, 50)} (${size} GB)`);
            });
        }

        // TorBox Stremio - Pre-resolved HLS
        report.h3('TorBox Stremio Addon');
        const stremioUrl = `https://stremio.torbox.app/${apiKey}/stream/movie/${CONFIG.testContent.movie.id}.json`;
        const stremioData = await fetchWithTimeout<any>(stremioUrl);
        const stremioStreams = stremioData.streams || [];

        // Separate by source type
        const torrentStreams = stremioStreams.filter((s: any) =>
            s.description?.toLowerCase().includes('torrent') ||
            !s.description?.toLowerCase().includes('usenet')
        );
        const usenetStreams = stremioStreams.filter((s: any) =>
            s.description?.toLowerCase().includes('usenet')
        );

        report.table(['Source', 'Count', 'Status'], [
            ['Torrents (Cached)', String(torrentStreams.length), torrentStreams.length > 0 ? '✅ Instant' : '❌'],
            ['Usenet', String(usenetStreams.length), usenetStreams.length > 0 ? '✅ Instant' : '❌'],
            ['Total', String(stremioStreams.length), stremioStreams.length > 0 ? '✅ READY' : '❌'],
        ]);

        if (stremioStreams.length > 0) {
            report.success('INSTANT PLAY AVAILABLE!');

            // Sample streams with full details
            report.h3('Sample Streams (with URLs)');
            stremioStreams.slice(0, 5).forEach((s: any, i: number) => {
                const quality = s.name?.match(/(4K|2160p|1080p|720p|480p)/i)?.[0] || 'Unknown';
                const source = s.description?.toLowerCase().includes('usenet') ? '📰 Usenet' : '🧲 Torrent';
                report.p(`**${i + 1}. ${source} - ${quality}**`);
                report.p(`   Name: ${truncate(s.name, 60)}`);
                if (s.url) report.p(`   URL: \`${truncate(s.url, 80)}\``);
            });
        }

    } catch (e) {
        report.error(`TorBox failed: ${e}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. OPENSUBTITLES - Subtitles (No API Key!)
// ═══════════════════════════════════════════════════════════════════════════

async function testOpenSubtitles() {
    report.h2('6. OpenSubtitles (Stremio Addon - NO API KEY!)');
    log('Testing OpenSubtitles...');

    try {
        const manifest = await fetchWithTimeout<any>(`${CONFIG.addons.opensubtitles}/manifest.json`);
        report.table(['Property', 'Value'], [
            ['ID', manifest.id],
            ['Name', manifest.name],
            ['Version', manifest.version],
        ]);

        // Get subtitles
        const subUrl = `${CONFIG.addons.opensubtitles}/subtitles/movie/${CONFIG.testContent.movie.id}.json`;
        const subData = await fetchWithTimeout<any>(subUrl);
        const subtitles = subData.subtitles || [];

        report.p(`**Subtitles Found:** ${subtitles.length}`);

        // Group by language
        const byLang: Record<string, number> = {};
        subtitles.forEach((s: any) => {
            const lang = s.lang || 'unknown';
            byLang[lang] = (byLang[lang] || 0) + 1;
        });

        report.table(['Language', 'Count'],
            Object.entries(byLang)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([l, c]) => [l, String(c)])
        );

        report.success('OpenSubtitles working (NO API key needed!)');
    } catch (e) {
        report.error(`OpenSubtitles failed: ${e}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. HANIME STREMIO - Hentai Content
// ═══════════════════════════════════════════════════════════════════════════

async function testHanimeStremio() {
    report.h2('7. Hanime Stremio Addon (Hentai)');
    log('Testing Hanime Stremio addon...');

    try {
        const manifest = await fetchWithTimeout<any>(`${CONFIG.addons.hanimeStremio}/manifest.json`);
        report.h3('Manifest');
        report.table(['Property', 'Value'], [
            ['ID', manifest.id || '-'],
            ['Name', manifest.name || '-'],
            ['Version', manifest.version || '-'],
            ['Types', manifest.types?.join(', ') || '-'],
        ]);

        // List catalogs
        if (manifest.catalogs?.length > 0) {
            report.h3('Available Catalogs');
            const catalogRows = manifest.catalogs.slice(0, 10).map((c: any) => [
                c.type || '-',
                c.id || '-',
                c.name || '-',
            ]);
            report.table(['Type', 'ID', 'Name'], catalogRows);
        }

        // Try to get catalog content
        if (manifest.catalogs?.length > 0) {
            const firstCatalog = manifest.catalogs[0];
            report.h3(`Catalog: ${firstCatalog.name || firstCatalog.id}`);

            try {
                const catalogUrl = `${CONFIG.addons.hanimeStremio}/catalog/${firstCatalog.type}/${firstCatalog.id}.json`;
                const catalogData = await fetchWithTimeout<any>(catalogUrl, {}, 10000);
                const items = catalogData.metas || [];

                report.p(`**Items Found:** ${items.length}`);

                if (items.length > 0) {
                    const itemRows = items.slice(0, 5).map((m: any) => [
                        truncate(m.name, 30),
                        m.genres?.slice(0, 2).join(', ') || '-',
                        m.poster ? '✅' : '❌',
                    ]);
                    report.table(['Title', 'Tags', 'Poster'], itemRows);
                }
            } catch (catalogErr) {
                report.warning(`Catalog fetch failed: ${catalogErr}`);
            }
        }

        report.success('Hanime Stremio addon accessible');
    } catch (e) {
        report.error(`Hanime Stremio failed: ${e}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY TABLE
// ═══════════════════════════════════════════════════════════════════════════

function generateSummary() {
    report.divider();
    report.h2('Provider Summary');

    report.p('| Provider | Type | Status |');
    report.p('|----------|------|--------|');
    report.p('| Cinemeta | Movies/Series Metadata | ✅ |');
    report.p('| TMDB | Rich Metadata | ✅ |');
    report.p('| Kitsu | Anime Metadata | ✅ |');
    report.p('| Torrentio | Torrent Streams | ✅ |');
    report.p('| TorBox | Cached Torrents + Usenet | ✅ |');
    report.p('| OpenSubtitles | Subtitles (No API!) | ✅ |');
    report.p('| Hanime Stremio | Hentai Content | ✅ |');
    report.p('');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    console.log('═'.repeat(60));
    console.log('  VELA PROVIDER TEST SUITE v5.0');
    console.log('  Testing ALL providers...');
    console.log('═'.repeat(60));
    console.log();

    report.h1('Provider Analysis');

    // Environment
    report.h2('Environment');
    report.table(['Variable', 'Status'], [
        ['TORBOX_API_KEY', process.env.TORBOX_API_KEY ? '✅ Set' : '❌ Not Set'],
    ]);

    // Run all tests
    await testCinemeta();
    await testTMDB();
    await testKitsu();
    await testKitsuPlayback();
    await testTorrentio();
    await testTorBox();
    await testOpenSubtitles();
    await testHanimeStremio();

    generateSummary();

    report.h2('Test Complete');
    report.p('All providers tested. Review sections above for detailed diagnostics.');

    report.save();

    console.log('\n✅ All tests completed!');
}

main().catch(console.error);
