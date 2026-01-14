/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STREAMING PROVIDERS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * All content providers for the streaming system.
 * Each provider is a clean, standalone module with simple HTTP calls.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Debrid / Pre-resolved Streams
// ─────────────────────────────────────────────────────────────────────────────

export { getTorBoxStreams } from './torbox';

// ─────────────────────────────────────────────────────────────────────────────
// Torrent Sources (need TorBox resolution)
// ─────────────────────────────────────────────────────────────────────────────

export {
    getTorrentioStreams,
    type TorrentioStream
} from './torrentio';

// ─────────────────────────────────────────────────────────────────────────────
// Metadata Providers
// ─────────────────────────────────────────────────────────────────────────────

// Cinemeta - Movies & Series
export {
    getCinemetaMeta,
    getCinemetaCatalog,
    type ContentMeta,
    type Episode
} from './cinemeta';

// TMDB - Enhanced metadata with trailers, cast, crew
export {
    getTMDBMeta,
    getTMDBCatalog,
    searchTMDB,
    type TMDBMeta,
    type TMDBVideo
} from './tmdb';

// Kitsu - Anime
export {
    getKitsuMeta,
    getKitsuCatalog,
    type AnimeMeta
} from './kitsu';

// Hanime - Adult anime (NSFW)
export {
    getHanimeMeta,
    getHanimeCatalog,
    getHanimeStreams,
    type HanimeMeta,
    type HanimeStream as HanimeStreamType,
} from './hanime';

// ─────────────────────────────────────────────────────────────────────────────
// Subtitles
// ─────────────────────────────────────────────────────────────────────────────

export { getSubtitles } from './opensubtitles';

// ─────────────────────────────────────────────────────────────────────────────
// Catalog Service (Unified)
// ─────────────────────────────────────────────────────────────────────────────

export {
    getCatalog,
    getMeta,
    getAvailableCatalogs,
    catalogService,
    type Meta,
    type CatalogDefinition,
} from './catalog';
