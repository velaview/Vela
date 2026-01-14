import { NextRequest, NextResponse } from 'next/server';

const CINEMETA = 'https://v3-cinemeta.strem.io';
const TMDB = 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club';
const KITSU = 'https://anime-kitsu.strem.fun';
const HANIME = 'https://86f0740f37f6-hanime-stremio.baby-beamup.club';

export async function GET(request: NextRequest) {
    const q = request.nextUrl.searchParams.get('q') || '';
    const provider = request.nextUrl.searchParams.get('provider') || 'cinemeta';

    if (!q) {
        return NextResponse.json({ results: [] });
    }

    try {
        let url = '';
        let mapFn: (m: any) => any;

        switch (provider) {
            case 'cinemeta':
                // Search via catalog with search param
                url = `${CINEMETA}/catalog/movie/top/search=${encodeURIComponent(q)}.json`;
                mapFn = (m: any) => ({
                    id: m.id,
                    name: m.name || m.title,
                    type: m.type || 'movie',
                    poster: m.poster,
                    year: m.year || m.releaseInfo,
                    provider: 'cinemeta',
                });
                break;

            case 'tmdb':
                url = `${TMDB}/catalog/movie/tmdb.popular/search=${encodeURIComponent(q)}.json`;
                mapFn = (m: any) => ({
                    id: m.id,
                    name: m.name || m.title,
                    type: m.type || 'movie',
                    poster: m.poster,
                    year: m.year || m.releaseInfo,
                    provider: 'tmdb',
                });
                break;

            case 'kitsu':
                url = `${KITSU}/catalog/anime/kitsu-anime-popular/search=${encodeURIComponent(q)}.json`;
                mapFn = (m: any) => ({
                    id: m.id,
                    name: m.name || m.title,
                    type: 'series',
                    poster: m.poster,
                    year: m.year || m.releaseInfo,
                    provider: 'kitsu',
                });
                break;

            case 'hanime':
                url = `${HANIME}/catalog/movie/browse/search=${encodeURIComponent(q)}.json`;
                mapFn = (m: any) => ({
                    id: m.id,
                    name: m.name || m.title,
                    type: 'movie',
                    poster: m.poster,
                    year: m.year || m.releaseInfo,
                    provider: 'hanime',
                });
                break;

            default:
                return NextResponse.json({ results: [], error: 'Unknown provider' });
        }

        const resp = await fetch(url, {
            signal: AbortSignal.timeout(10000),
            next: { revalidate: 60 },
        });

        if (!resp.ok) {
            return NextResponse.json({ results: [], error: `HTTP ${resp.status}` });
        }

        const data = await resp.json();
        const results = (data.metas || []).slice(0, 20).map(mapFn);

        return NextResponse.json({ results });

    } catch (error) {
        return NextResponse.json({ results: [], error: String(error) });
    }
}
