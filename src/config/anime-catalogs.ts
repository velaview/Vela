// ─────────────────────────────────────────────────────────────
// Anime Catalog Configuration
// ─────────────────────────────────────────────────────────────

/**
 * Centralized configuration for anime catalogs from org.stremio.animecatalogs addon
 * This addon aggregates catalogs from MAL, AniList, Kitsu, AniDB, and more.
 */

export interface AnimeCatalogConfig {
    id: string;
    name: string;
    source: string;
    supportsGenre: boolean;
    supportsNSFW: boolean;
    description?: string;
}

export const ANIME_CATALOGS: Record<string, AnimeCatalogConfig> = {
    trending: {
        id: 'anilist_trending-now',
        name: 'Trending Now',
        source: 'org.stremio.animecatalogs',
        supportsGenre: true,
        supportsNSFW: false,
        description: 'Currently trending anime from AniList'
    },
    popular: {
        id: 'anilist_all-time-popular',
        name: 'All Time Popular',
        source: 'org.stremio.animecatalogs',
        supportsGenre: true,
        supportsNSFW: false,
        description: 'Most popular anime of all time from AniList'
    },
    rating: {
        id: 'anilist_top-anime',
        name: 'Top Rated',
        source: 'org.stremio.animecatalogs',
        supportsGenre: true,
        supportsNSFW: false,
        description: 'Highest rated anime from AniList'
    },
    newest: {
        id: 'anilist_popular-this-season',
        name: 'Popular This Season',
        source: 'org.stremio.animecatalogs',
        supportsGenre: true,
        supportsNSFW: false,
        description: 'Popular anime airing this season from AniList'
    }
} as const;

// ─────────────────────────────────────────────────────────────
// Genre Configuration with Content Rating Classification
// ─────────────────────────────────────────────────────────────

export interface AnimeGenre {
    id: string;
    category: string;
    contentRating?: 'safe' | 'teen' | 'mature';
}

export const ANIME_GENRES: AnimeGenre[] = [
    // Action & Adventure
    { id: 'Action', category: 'Action & Adventure' },
    { id: 'Adventure', category: 'Action & Adventure' },
    { id: 'Fantasy', category: 'Action & Adventure' },
    { id: 'Magic', category: 'Action & Adventure' },
    { id: 'Supernatural', category: 'Action & Adventure' },
    { id: 'Mecha', category: 'Action & Adventure' },
    { id: 'Martial Arts', category: 'Action & Adventure' },
    { id: 'Super Power', category: 'Action & Adventure' },

    // Comedy & Slice of Life
    { id: 'Comedy', category: 'Comedy & Slice of Life' },
    { id: 'Slice of Life', category: 'Comedy & Slice of Life' },
    { id: 'School', category: 'Comedy & Slice of Life' },
    { id: 'Romance', category: 'Comedy & Slice of Life' },
    { id: 'Music', category: 'Comedy & Slice of Life' },
    { id: 'Sports', category: 'Comedy & Slice of Life' },
    { id: 'Parody', category: 'Comedy & Slice of Life' },

    // Dark & Thriller
    { id: 'Horror', category: 'Dark & Thriller' },
    { id: 'Thriller', category: 'Dark & Thriller' },
    { id: 'Psychological', category: 'Dark & Thriller' },
    { id: 'Mystery', category: 'Dark & Thriller' },
    { id: 'Police', category: 'Dark & Thriller' },
    { id: 'Vampire', category: 'Dark & Thriller' },
    { id: 'Gore', category: 'Dark & Thriller' },

    // Sci-Fi & Space
    { id: 'Sci-Fi', category: 'Sci-Fi & Space' },
    { id: 'Space', category: 'Sci-Fi & Space' },
    { id: 'Cyberpunk', category: 'Sci-Fi & Space' },

    // Drama & Romance
    { id: 'Drama', category: 'Drama & Romance' },
    { id: 'Tragedy', category: 'Drama & Romance' },
    { id: 'Historical', category: 'Drama & Romance' },
    { id: 'Friendship', category: 'Drama & Romance' },

    // Other
    { id: 'Military', category: 'Other' },
    { id: 'Game', category: 'Other' },
    { id: 'Kids', category: 'Other' },
    { id: 'Demons', category: 'Other' },
    { id: 'Samurai', category: 'Other' },
    // NSFW - Suggestive (17+)
    { id: 'Ecchi', category: 'NSFW', contentRating: 'teen' },
    { id: 'Yuri', category: 'NSFW', contentRating: 'teen' },
    { id: 'Yaoi', category: 'NSFW', contentRating: 'teen' },
    { id: 'Shounen Ai', category: 'NSFW', contentRating: 'teen' },
    { id: 'Shoujo Ai', category: 'NSFW', contentRating: 'teen' },
    { id: 'Harem', category: 'NSFW', contentRating: 'teen' },

    // NSFW - Explicit (18+)
    { id: 'Hentai', category: 'NSFW', contentRating: 'mature' },
];

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

/**
 * Get catalog configuration by sort key
 */
export function getCatalogConfig(sortKey: 'trending' | 'popular' | 'rating' | 'newest'): AnimeCatalogConfig {
    return ANIME_CATALOGS[sortKey];
}

/**
 * Get genres by category
 */
export function getGenresByCategory(category: string): AnimeGenre[] {
    return ANIME_GENRES.filter(g => g.category === category);
}

/**
 * Get NSFW genres by content rating
 */
export function getNSFWGenres(contentRating: 'teen' | 'mature'): string[] {
    return ANIME_GENRES
        .filter(g => g.contentRating && (
            contentRating === 'mature' || g.contentRating === contentRating
        ))
        .map(g => g.id);
}

/**
 * Get all genre categories
 */
export function getGenreCategories(): string[] {
    return Array.from(new Set(ANIME_GENRES.map(g => g.category)));
}
