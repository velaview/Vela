import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Curated standard genres for a premium experience
        const genres = [
            'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
            'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
            'Horror', 'Music', 'Mystery', 'Romance', 'Sci-Fi',
            'Thriller', 'War', 'Western'
        ];

        // Anime specific genres/demographics
        const animeGenres = [
            'Shonen', 'Shojo', 'Seinen', 'Josei', 'Slice of Life',
            'Mecha', 'Isekai', 'Supernatural', 'Psychological'
        ];

        // Decades for better time-based filtering
        const decades = [
            { id: '2020s', label: '2020s', start: 2020, end: 2029 },
            { id: '2010s', label: '2010s', start: 2010, end: 2019 },
            { id: '2000s', label: '2000s', start: 2000, end: 2009 },
            { id: '90s', label: '90s', start: 1990, end: 1999 },
            { id: '80s', label: '80s', start: 1980, end: 1989 },
            { id: '70s', label: '70s', start: 1970, end: 1979 },
            { id: 'older', label: 'Older', start: 1900, end: 1969 },
        ];

        return NextResponse.json({
            data: {
                genres: genres.sort(),
                animeGenres: animeGenres.sort(),
                types: [
                    { id: 'all', label: 'All' },
                    { id: 'movie', label: 'Movies' },
                    { id: 'series', label: 'TV Shows' },
                    { id: 'anime', label: 'Anime' },
                ],
                decades,
                ratings: ['8+', '7+', '6+', '5+'],
            }
        });
    } catch (error) {
        console.error('Failed to fetch filters:', error);
        return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
    }
}
