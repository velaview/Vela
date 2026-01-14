// ─────────────────────────────────────────────────────────────
// Application Constants
// ─────────────────────────────────────────────────────────────

export const APP_NAME = 'Vela';
export const APP_DESCRIPTION = 'Everything you want to watch. Nothing you don\'t.';
export const APP_VERSION = '1.0.0';

// ─────────────────────────────────────────────────────────────
// API Configuration
// ─────────────────────────────────────────────────────────────

export const TORBOX_API_BASE = 'https://api.torbox.app/v1';

// ─────────────────────────────────────────────────────────────
// Auto-installed Addons (installed automatically for new users)
// These are verified working addons from stremio-addons.com
// ─────────────────────────────────────────────────────────────

export const DEFAULT_ADDONS = [
  // Essential Catalogs & Metadata (all verified working)
  {
    id: 'cinemeta',
    name: 'Cinemeta',
    url: 'https://v3-cinemeta.strem.io/manifest.json',
    description: 'Official movie and series catalog with metadata from IMDB',
    category: 'catalog',
    priority: 1,
  },
  // Subtitles
  {
    id: 'opensubtitles-v3',
    name: 'OpenSubtitles',
    url: 'https://opensubtitles-v3.strem.io/manifest.json',
    description: 'Subtitles in 60+ languages',
    category: 'subtitles',
    priority: 2,
  },
  // Stream Providers (verified working)
  {
    id: 'torrentio-lite',
    name: 'Torrentio Lite',
    url: 'https://torrentio.strem.fun/lite/manifest.json',
    description: 'Reliable torrent streams without configuration',
    category: 'streams',
    priority: 3,
  },
  {
    id: 'thepiratebay-plus',
    name: 'ThePirateBay+',
    url: 'https://thepiratebay-plus.strem.fun/manifest.json',
    description: 'Streams from ThePirateBay tracker',
    category: 'streams',
    priority: 4,
  },
] as const;

// ─────────────────────────────────────────────────────────────
// Cloudflare-protected addons (must be installed from browser)
// These addons block server-side requests but work from browser
// ─────────────────────────────────────────────────────────────

export const BROWSER_ONLY_ADDONS = [
  {
    id: 'torrentio',
    name: 'Torrentio',
    url: 'https://torrentio.strem.fun/manifest.json',
    description: 'Torrent streams from YTS, EZTV, RARBG, 1337x, TPB and more',
    category: 'streams',
  },
  {
    id: 'thepiratebay-plus',
    name: 'ThePirateBay+',
    url: 'https://thepiratebay-plus.strem.fun/manifest.json',
    description: 'Streams from ThePirateBay tracker',
    category: 'streams',
  },
  {
    id: 'torrent-catalogs',
    name: 'Torrent Catalogs',
    url: 'https://torrent-catalogs.strem.fun/manifest.json',
    description: 'Browse trending torrents from popular trackers',
    category: 'catalog',
  },
] as const;

// ─────────────────────────────────────────────────────────────
// Suggested Community Addons (verified working URLs)
// ─────────────────────────────────────────────────────────────

export const SUGGESTED_ADDONS = [
  // Stream Providers with Debrid Support (require configuration)
  {
    id: 'torrentio-configured',
    name: 'Torrentio (with Debrid)',
    url: 'https://torrentio.strem.fun/manifest.json',
    configureUrl: 'https://torrentio.strem.fun/configure',
    description: 'Configure Torrentio with your debrid service (RealDebrid, AllDebrid, Premiumize, TorBox) for cached instant streams.',
    category: 'streams',
    requiresConfig: true,
    configInstructions: 'Click Configure, select providers, enter your debrid API key, then copy the manifest URL and install via Custom URL tab.',
  },
  {
    id: 'torbox',
    name: 'TorBox',
    url: 'https://stremio.torbox.app/manifest.json',
    configureUrl: 'https://stremio.torbox.app/configure',
    description: 'Stream directly from your TorBox account with cached torrents.',
    category: 'streams',
    requiresConfig: true,
    configInstructions: 'Enter your TorBox API key in the configure page to get your personalized manifest URL.',
  },
  {
    id: 'thepiratebay-plus',
    name: 'ThePirateBay+',
    url: 'https://thepiratebay-plus.strem.fun/manifest.json',
    description: 'Streams from ThePirateBay torrent tracker.',
    category: 'streams',
    requiresConfig: false,
  },
  {
    id: 'peerflix',
    name: 'Peerflix',
    url: 'https://peerflix.mov/manifest.json',
    configureUrl: 'https://peerflix.mov/configure',
    description: 'P2P streaming with debrid support.',
    category: 'streams',
    requiresConfig: true,
    configInstructions: 'Configure for optimal streaming quality and debrid connection.',
  },
  // Catalogs
  {
    id: 'tmdb-addon',
    name: 'TMDB Addon',
    url: 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club/manifest.json',
    configureUrl: 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club/configure',
    description: 'The Movie Database catalogs with HD posters and additional metadata.',
    category: 'catalog',
    requiresConfig: false,
  },
  {
    id: 'org.stremio.animecatalogs',
    name: 'Anime Catalogs',
    url: 'https://1fe84bc728af-stremio-anime-catalogs.baby-beamup.club/%7B%22cinemeta%22%3A%22on%22%2C%22search%22%3A%22on%22%2C%22myanimelist_top-all-time%22%3A%22on%22%2C%22myanimelist_top-airing%22%3A%22on%22%2C%22myanimelist_top-series%22%3A%22on%22%2C%22myanimelist_top-movies%22%3A%22on%22%2C%22myanimelist_popular%22%3A%22on%22%2C%22myanimelist_most-favorited%22%3A%22on%22%2C%22anidb_popular%22%3A%22on%22%2C%22anidb_latest-started%22%3A%22on%22%2C%22anidb_latest-ended%22%3A%22on%22%2C%22anidb_best-of-10s%22%3A%22on%22%2C%22anidb_best-of-00s%22%3A%22on%22%2C%22anidb_best-of-90s%22%3A%22on%22%2C%22anidb_best-of-80s%22%3A%22on%22%2C%22anilist_trending-now%22%3A%22on%22%2C%22anilist_popular-this-season%22%3A%22on%22%2C%22anilist_upcoming-next-season%22%3A%22on%22%2C%22anilist_all-time-popular%22%3A%22on%22%2C%22anilist_top-anime%22%3A%22on%22%2C%22kitsu_top-airing%22%3A%22on%22%2C%22kitsu_most-popular%22%3A%22on%22%2C%22kitsu_highest-rated%22%3A%22on%22%2C%22anisearch_top-all-time%22%3A%22on%22%2C%22anisearch_trending%22%3A%22on%22%2C%22anisearch_popular%22%3A%22on%22%2C%22livechart_popular%22%3A%22on%22%2C%22livechart_top-rated%22%3A%22on%22%2C%22notifymoe_airing-now%22%3A%22on%22%7D/manifest.json',
    description: 'Comprehensive anime catalogs from MAL, AniList, Kitsu, and more.',
    category: 'catalog',
    requiresConfig: false,
  },
  {
    id: 'streaming-catalogs',
    name: 'Streaming Catalogs',
    url: 'https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json',
    configureUrl: 'https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/configure',
    description: 'Browse catalogs from Netflix, Disney+, HBO Max, Prime Video, and more.',
    category: 'catalog',
    requiresConfig: true,
    configInstructions: 'Select which streaming service catalogs you want to browse.',
  },
  {
    id: 'imdb-catalogs',
    name: 'IMDB Catalogs',
    url: 'https://1fe84bc728af-imdb-catalogs.baby-beamup.club/manifest.json',
    configureUrl: 'https://1fe84bc728af-imdb-catalogs.baby-beamup.club/configure',
    description: 'IMDB Top 250, Most Popular, and custom lists.',
    category: 'catalog',
    requiresConfig: false,
  },
  {
    id: 'torrent-catalogs',
    name: 'Torrent Catalogs',
    url: 'https://torrent-catalogs.strem.fun/manifest.json',
    description: 'Browse trending torrents from popular trackers.',
    category: 'catalog',
    requiresConfig: false,
  },
  // Subtitles
  {
    id: 'opensubtitles-v3',
    name: 'OpenSubtitles',
    url: 'https://opensubtitles-v3.strem.io/manifest.json',
    description: 'Subtitles in 60+ languages from OpenSubtitles.org.',
    category: 'subtitles',
    requiresConfig: false,
  },
  {
    id: 'msubtitles',
    name: 'MSubtitles',
    url: 'https://msubtitles.lowlevel1989.click/conf/api/manifest.json',
    configureUrl: 'https://msubtitles.lowlevel1989.click/conf/api/configure',
    description: 'Additional subtitle sources with multiple language support.',
    category: 'subtitles',
    requiresConfig: false,
  },
  // Anime Specific
  {
    id: 'animeo',
    name: 'Animeo',
    url: 'https://7a625ac658ec-animeo.baby-beamup.club/manifest.json',
    configureUrl: 'https://7a625ac658ec-animeo.baby-beamup.club/configure',
    description: 'Anime streams from multiple sources.',
    category: 'streams',
    requiresConfig: true,
    configInstructions: 'Configure preferred anime sources and quality settings.',
  },
  // Asian Content
  {
    id: 'streamasia',
    name: 'StreamAsia',
    url: 'https://stremio-dramacool-addon.xyz/manifest.json',
    configureUrl: 'https://stremio-dramacool-addon.xyz/configure',
    description: 'Asian dramas and movies from DramaCool and other sources.',
    category: 'streams',
    requiresConfig: false,
  },
  // Adult Content (18+) - Requires user opt-in
  {
    id: 'hanime',
    name: 'Hanime',
    url: 'https://hanime-stremio.fly.dev/manifest.json',
    configureUrl: 'https://hanime-stremio.fly.dev/configure',
    description: 'Adult anime (Hentai) streams. Requires Hanime.tv account.',
    category: 'streams',
    requiresConfig: true,
    adult: true,
    configInstructions: 'Enter your Hanime.tv email and password to authenticate.',
  },
] as const;

export type SuggestedAddon = typeof SUGGESTED_ADDONS[number];

// ─────────────────────────────────────────────────────────────
// Cache TTL (in seconds)
// ─────────────────────────────────────────────────────────────

export const CACHE_TTL = {
  catalog: 60 * 60, // 1 hour
  meta: 24 * 60 * 60, // 24 hours
  streams: 5 * 60, // 5 minutes
  manifest: 7 * 24 * 60 * 60, // 7 days
} as const;

// ─────────────────────────────────────────────────────────────
// Quality Options
// ─────────────────────────────────────────────────────────────

export const QUALITY_OPTIONS = ['auto', '4k', '1080p', '720p', '480p'] as const;
export type Quality = typeof QUALITY_OPTIONS[number];

// ─────────────────────────────────────────────────────────────
// Playback Speed Options
// ─────────────────────────────────────────────────────────────

export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

// ─────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─────────────────────────────────────────────────────────────
// Animation Durations (in ms)
// ─────────────────────────────────────────────────────────────

export const ANIMATION = {
  cardHover: 200,
  cardInfo: 150,
  rowScroll: 300,
  heroTransition: 500,
  modalOpen: 200,
  pageTransition: 150,
} as const;

// ─────────────────────────────────────────────────────────────
// Breakpoints
// ─────────────────────────────────────────────────────────────

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// ─────────────────────────────────────────────────────────────
// Content Row Configuration
// ─────────────────────────────────────────────────────────────

export const HOMEPAGE_ROWS = [
  {
    id: 'continue-watching',
    title: 'Continue Watching',
    type: 'progress' as const,
    source: 'local',
    priority: 1,
  },
  {
    id: 'trending-movies',
    title: 'Trending Movies',
    type: 'catalog' as const,
    source: 'tmdb',
    catalogType: 'movie',
    catalogId: 'tmdb.trending',
    priority: 2,
  },
  {
    id: 'popular-series',
    title: 'Popular Series',
    type: 'catalog' as const,
    source: 'tmdb',
    catalogType: 'series',
    catalogId: 'tmdb.top',
    priority: 3,
  },
  {
    id: 'top-anime',
    title: 'Top Anime',
    type: 'catalog' as const,
    source: 'org.stremio.animecatalogs',
    catalogType: 'anime',
    catalogId: 'anilist_trending-now',
    priority: 4,
  },
  {
    id: 'trending-series',
    title: 'Trending Series',
    type: 'catalog' as const,
    source: 'tmdb',
    catalogType: 'series',
    catalogId: 'tmdb.trending',
    priority: 5,
  },
  {
    id: 'top-rated-movies',
    title: 'Top Rated Movies',
    type: 'catalog' as const,
    source: 'tmdb',
    catalogType: 'movie',
    catalogId: 'tmdb.top',
    priority: 5,
  },
  {
    id: 'new-releases',
    title: 'New Releases',
    type: 'catalog' as const,
    source: 'tmdb',
    catalogType: 'movie',
    catalogId: 'tmdb.year',
    priority: 5,
  },
] as const;
