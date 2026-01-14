// ─────────────────────────────────────────────────────────────
// Content Rating Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Content Rating System for anime filtering.
 * - safe: All ages, no NSFW content
 * - teen: 17+ content (suggestive themes like Ecchi, Yuri, Yaoi)
 * - mature: 18+ content (explicit like Hentai)
 */
export type ContentRating = 'safe' | 'teen' | 'mature';

/**
 * Maturity Level from user preferences (legacy format).
 */
export type MaturityLevel = 'all' | 'pg' | 'pg13' | 'r';

// ─────────────────────────────────────────────────────────────
// Genre Classifications
// ─────────────────────────────────────────────────────────────

/** Explicit genres (18+ only) - Only definitively adult content */
export const EXPLICIT_GENRES = ['Hentai'] as const;

/** Suggestive genres (17+ / Teen) - Mature themes but not explicit */
export const SUGGESTIVE_GENRES = [
    'Ecchi',
    'Yuri',
    'Yaoi',
    'Shounen Ai',
    'Shoujo Ai',
    'Harem',
    'Fanservice',
    'Siscon',
    'Brocon',
] as const;

/** All NSFW genres combined */
export const ALL_NSFW_GENRES = [...EXPLICIT_GENRES, ...SUGGESTIVE_GENRES] as const;

// ─────────────────────────────────────────────────────────────
// Known NSFW Titles (Fallback when genres unavailable)
// ─────────────────────────────────────────────────────────────

/** 
 * Known anime titles that are Teen (17+) rated.
 * Used as fallback when genre data is unavailable.
 * Normalized to lowercase for matching.
 */
export const KNOWN_TEEN_TITLES = new Set([
    // Ecchi/Fanservice
    'high school dxd',
    'high school dxd new',
    'high school dxd born',
    'high school dxd hero',
    'to love-ru',
    'to love ru',
    'to love-ru darkness',
    'prison school',
    'food wars',
    'food wars! shokugeki no soma',
    'shokugeki no soma',
    'kill la kill',
    'no game no life',
    'no game, no life',
    'the testament of sister new devil',
    'shinmai maou no testament',
    'shimoneta',
    'monster musume',
    'monster musume no iru nichijou',
    'highschool of the dead',
    'keijo!!!!!!!!',
    'keijo',
    'maken-ki!',
    'maken ki',
    'rosario + vampire',
    'rosario to vampire',
    'sekirei',
    'freezing',
    'queens blade',
    "queen's blade",
    'ikki tousen',
    'ikkitousen',
    'kämpfer',
    'kampfer',
    'heavens lost property',
    "heaven's lost property",
    'sora no otoshimono',
    'infinite stratos',
    'is: infinite stratos',
    'date a live',
    'date a live ii',
    'date a live iii',
    'date a live iv',
    'trinity seven',
    'haganai',
    'boku wa tomodachi ga sukunai',
    'my teen romantic comedy snafu',
    'oregairu',
    'yahari ore no seishun',
    'rent-a-girlfriend',
    'kanojo, okarishimasu',
    'domestic girlfriend',
    'domestic na kanojo',
    'scums wish',
    "scum's wish",
    'kuzu no honkai',
    'interspecies reviewers',
    'ishuzoku reviewers',
    'redo of healer',
    'kaifuku jutsushi no yarinaoshi',
    'peter grill',
    'peter grill and the philosophers time',

    // Harem
    'the quintessential quintuplets',
    'gotoubun no hanayome',
    'nisekoi',
    'love hina',
    'tenchi muyo',
    'shuffle!',
    'shuffle',
    'clannad',

    // Yuri
    'citrus',
    'bloom into you',
    'yagate kimi ni naru',
    'sakura trick',
    'strawberry panic',
    'kannazuki no miko',
    'destiny of the shrine maiden',
    'maria-sama ga miteru',
    'maria watches over us',
    'revolutionary girl utena',
    'shoujo kakumei utena',
    'adachi and shimamura',
    'adachi to shimamura',

    // Yaoi/BL
    'given',
    'love stage',
    'love stage!!',
    'super lovers',
    'sekaiichi hatsukoi',
    "world's greatest first love",
    'junjou romantica',
    'gravitation',
    'doukyuusei',
    'classmates',
    'banana fish',
]);

/**
 * Known anime titles that are Mature (18+) rated.
 * Explicit hentai titles.
 */
export const KNOWN_MATURE_TITLES = new Set([
    // Explicit content - these should never appear in safe mode
    'overflow',
    'redo of healer',
    'kaifuku jutsushi no yarinaoshi',
    'interspecies reviewers',
    'ishuzoku reviewers',
    'peter grill and the philosophers time',
]);

// ─────────────────────────────────────────────────────────────
// Conversion Functions
// ─────────────────────────────────────────────────────────────

/**
 * Convert user's maturity preference to content rating filter.
 * 
 * Mapping:
 * - 'all' / 'pg' → 'safe' (family-friendly only)
 * - 'pg13' → 'teen' (suggestive content allowed)
 * - 'r' → 'mature' (all content including explicit)
 */
export function maturityToContentRating(maturity: MaturityLevel): ContentRating {
    switch (maturity) {
        case 'all':
        case 'pg':
            return 'safe';
        case 'pg13':
            return 'teen';
        case 'r':
            return 'mature';
    }
}

/**
 * Convert content rating back to maturity level.
 */
export function contentRatingToMaturity(rating: ContentRating): MaturityLevel {
    switch (rating) {
        case 'safe':
            return 'pg';
        case 'teen':
            return 'pg13';
        case 'mature':
            return 'r';
    }
}

// ─────────────────────────────────────────────────────────────
// Filtering Functions
// ─────────────────────────────────────────────────────────────

/**
 * Check if a genre list requires a specific content rating.
 */
export function getRequiredRating(genres: string[]): ContentRating {
    const normalizedGenres = genres.map((g) => g.toLowerCase());

    if (EXPLICIT_GENRES.some((g) => normalizedGenres.includes(g.toLowerCase()))) {
        return 'mature';
    }

    if (SUGGESTIVE_GENRES.some((g) => normalizedGenres.includes(g.toLowerCase()))) {
        return 'teen';
    }

    return 'safe';
}

/**
 * Check content rating by title (fallback when genres unavailable).
 */
export function getRequiredRatingByTitle(title: string): ContentRating {
    const normalizedTitle = title.toLowerCase().trim();

    // Check mature titles first
    if (KNOWN_MATURE_TITLES.has(normalizedTitle)) {
        return 'mature';
    }

    // Check teen titles
    if (KNOWN_TEEN_TITLES.has(normalizedTitle)) {
        return 'teen';
    }

    // Partial matching for season variations (e.g., "High School DxD Season 4")
    // Only match if the anime title STARTS with a known NSFW title
    for (const knownTitle of KNOWN_MATURE_TITLES) {
        if (normalizedTitle.startsWith(knownTitle)) {
            return 'mature';
        }
    }

    for (const knownTitle of KNOWN_TEEN_TITLES) {
        if (normalizedTitle.startsWith(knownTitle)) {
            return 'teen';
        }
    }

    return 'safe';
}

/**
 * Get required rating using both genres AND title as fallback.
 * Returns the HIGHEST rating from either source.
 */
export function getRequiredRatingWithFallback(genres: string[], title?: string): ContentRating {
    const genreRating = getRequiredRating(genres);
    const titleRating = title ? getRequiredRatingByTitle(title) : 'safe';

    // Return the highest rating
    const hierarchy: Record<ContentRating, number> = {
        safe: 0,
        teen: 1,
        mature: 2,
    };

    return hierarchy[genreRating] >= hierarchy[titleRating] ? genreRating : titleRating;
}

/**
 * Check if content passes the given rating filter.
 * Uses both genres and title for fallback filtering.
 */
export function passesRatingFilter(genres: string[], allowedRating: ContentRating, title?: string): boolean {
    const requiredRating = getRequiredRatingWithFallback(genres, title);

    // Rating hierarchy: safe < teen < mature
    const hierarchy: Record<ContentRating, number> = {
        safe: 0,
        teen: 1,
        mature: 2,
    };

    return hierarchy[requiredRating] <= hierarchy[allowedRating];
}

