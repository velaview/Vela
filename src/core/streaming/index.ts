/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STREAMING MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Clean streaming architecture for Vela.
 * This is the SINGLE source of truth for all streaming functionality.
 * 
 * Usage:
 *   import { resolveStream, getCatalog, getTorBoxStreams } from '@/core/streaming';
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type {
    Stream,
    Subtitle,
    Quality,
    ContentType,
    StreamSource,
    PlayRequest,
    PlayResponse,
    StreamSession,
} from './types';

// Re-export Meta type for backward compatibility
export type { Meta, CatalogDefinition } from './providers/catalog';

// ─────────────────────────────────────────────────────────────────────────────
// Main Resolver
// ─────────────────────────────────────────────────────────────────────────────

export { resolveStream } from './resolver';

// ─────────────────────────────────────────────────────────────────────────────
// Session Management
// ─────────────────────────────────────────────────────────────────────────────

export {
    createSession,
    getSession,
    updateSessionUrl,
    deleteSession,
} from './session';

// ─────────────────────────────────────────────────────────────────────────────
// Catalog Service (Main Entry Point)
// ─────────────────────────────────────────────────────────────────────────────

export {
    getCatalog,
    getMeta,
    getAvailableCatalogs,
    catalogService,
} from './providers/catalog';

// ─────────────────────────────────────────────────────────────────────────────
// Stream Providers
// ─────────────────────────────────────────────────────────────────────────────

export { getTorBoxStreams } from './providers/torbox';
export { getTorrentioStreams, type TorrentioStream } from './providers/torrentio';

// ─────────────────────────────────────────────────────────────────────────────
// Metadata Providers (Direct Access)
// ─────────────────────────────────────────────────────────────────────────────

export { getCinemetaMeta, getCinemetaCatalog, type ContentMeta, type Episode } from './providers/cinemeta';
export { getTMDBMeta, getTMDBCatalog, searchTMDB, type TMDBMeta } from './providers/tmdb';
export { getKitsuMeta, getKitsuCatalog, type AnimeMeta } from './providers/kitsu';
export { getHanimeMeta, getHanimeCatalog, getHanimeStreams, type HanimeMeta } from './providers/hanime';

// ─────────────────────────────────────────────────────────────────────────────
// Subtitles
// ─────────────────────────────────────────────────────────────────────────────

export { getSubtitles } from './providers/opensubtitles';
