import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────
// Users Table
// ─────────────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  nickname: text('nickname'), // Global nickname for Watch Together
  avatar: text('avatar'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(preferences, {
    fields: [users.id],
    references: [preferences.userId],
  }),
  library: many(library),
  history: many(history),
  addons: many(addons),
  searchHistory: many(searchHistory),
  hostedRooms: many(watchRooms),
  roomMemberships: many(watchRoomMembers),
  friends: many(watchFriends),
}));

// ─────────────────────────────────────────────────────────────
// User Preferences Table
// ─────────────────────────────────────────────────────────────

export const preferences = sqliteTable('preferences', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme').default('dark'),
  language: text('language').default('en'),
  autoplayNext: integer('autoplay_next', { mode: 'boolean' }).default(true),
  autoplayPreviews: integer('autoplay_previews', { mode: 'boolean' }).default(true),
  defaultQuality: text('default_quality').default('auto'),
  subtitleLang: text('subtitle_lang').default('en'),
  maturityLevel: text('maturity_level').default('all'),
  torboxKeyEncrypted: text('torbox_key_encrypted'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  // Phase 1.5: Taste Profile
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).default(false),
  preferredTypes: text('preferred_types', { mode: 'json' }).$type<string[]>(),
  preferredRegions: text('preferred_regions', { mode: 'json' }).$type<string[]>(),
  preferredGenres: text('preferred_genres', { mode: 'json' }).$type<string[]>(),
  preferredVibes: text('preferred_vibes', { mode: 'json' }).$type<string[]>(),
  preferredStudios: text('preferred_studios', { mode: 'json' }).$type<string[]>(),
  preferredActors: text('preferred_actors', { mode: 'json' }).$type<string[]>(),
  preferredDirectors: text('preferred_directors', { mode: 'json' }).$type<string[]>(),
  location: text('location', { mode: 'json' }).$type<{
    country: string;
    countryCode: string;
    city?: string;
    timezone: string;
  }>(),
});

export const preferencesRelations = relations(preferences, ({ one }) => ({
  user: one(users, {
    fields: [preferences.userId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// Library (My List) Table
// ─────────────────────────────────────────────────────────────

export const library = sqliteTable('library', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contentId: text('content_id').notNull(),
  contentType: text('content_type').notNull(), // 'movie' | 'series' | 'anime'
  title: text('title').notNull(),
  poster: text('poster'),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userContentUnique: unique().on(table.userId, table.contentId),
}));

export const libraryRelations = relations(library, ({ one }) => ({
  user: one(users, {
    fields: [library.userId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// Watch History Table
// ─────────────────────────────────────────────────────────────

export const history = sqliteTable('history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contentId: text('content_id').notNull(),
  contentType: text('content_type').notNull(),
  title: text('title').notNull(),
  poster: text('poster'),
  season: integer('season'),
  episode: integer('episode'),
  episodeTitle: text('episode_title'),
  position: integer('position').notNull(), // seconds
  duration: integer('duration').notNull(), // seconds
  watchedAt: integer('watched_at', { mode: 'timestamp' }).notNull(),
  completed: integer('completed', { mode: 'boolean' }).default(false),
}, (table) => ({
  userContentEpisodeUnique: unique().on(table.userId, table.contentId, table.season, table.episode),
}));

export const historyRelations = relations(history, ({ one }) => ({
  user: one(users, {
    fields: [history.userId],
    references: [users.id],
  }),
  content: one(contents, {
    fields: [history.contentId],
    references: [contents.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// Installed Addons Table
// ─────────────────────────────────────────────────────────────

export const addons = sqliteTable('addons', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addonId: text('addon_id').notNull(),
  manifestUrl: text('manifest_url').notNull(),
  manifest: text('manifest').notNull(), // JSON string
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  position: integer('position').default(0),
}, (table) => ({
  userAddonUnique: unique().on(table.userId, table.addonId),
}));

export const addonsRelations = relations(addons, ({ one }) => ({
  user: one(users, {
    fields: [addons.userId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// System Addons Table (Server-side managed)
// ─────────────────────────────────────────────────────────────

export const systemAddons = sqliteTable('system_addons', {
  id: text('id').primaryKey(),
  addonId: text('addon_id').notNull(),
  manifestUrl: text('manifest_url').notNull(),
  manifest: text('manifest').notNull(), // JSON string
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  category: text('category').notNull(), // 'catalog' | 'streams' | 'subtitles'
  position: integer('position').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ─────────────────────────────────────────────────────────────
// Content Catalog (Phase 2)
// ─────────────────────────────────────────────────────────────

export const contents = sqliteTable('contents', {
  id: text('id').primaryKey(), // Internal UUID
  externalId: text('external_id').notNull(), // e.g., tt1234567
  externalSource: text('external_source').notNull(), // e.g., cinemeta, tmdb
  type: text('type').notNull(), // movie, series, anime
  title: text('title').notNull(),
  poster: text('poster'),
  background: text('background'),
  description: text('description'),
  year: text('year'),
  imdbRating: text('imdb_rating'),
  genres: text('genres', { mode: 'json' }).$type<string[]>(),
  // Enhanced metadata for filtering
  tags: text('tags', { mode: 'json' }).$type<string[]>(), // All addon-provided tags/keywords
  ageRating: text('age_rating'), // "G", "PG", "PG-13", "R", "TV-MA", etc.
  contentRating: text('content_rating').default('safe'), // Computed: "safe" | "teen" | "mature"
  popularity: integer('popularity'), // For popularity-based sorting
  releaseDate: text('release_date'), // Full date for seasonal filtering
  runtime: integer('runtime'),
  trailer: text('trailer'), // URL or YT ID
  country: text('country'),
  language: text('language'),
  // Rich Metadata
  cast: text('cast', { mode: 'json' }).$type<string[]>(),
  director: text('director'),
  studios: text('studios', { mode: 'json' }).$type<string[]>(),
  status: text('status'), // 'released', 'ended', 'returning', 'canceled'
  logo: text('logo'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  externalUnique: unique().on(table.externalId, table.externalSource),
}));

// ─────────────────────────────────────────────────────────────
// Catalog Entries Table
// ─────────────────────────────────────────────────────────────

export const catalogEntries = sqliteTable('catalog_entries', {
  id: text('id').primaryKey(),
  contentId: text('content_id').notNull().references(() => contents.id, { onDelete: 'cascade' }),
  catalogType: text('catalog_type').notNull(), // movie, series
  catalogId: text('catalog_id').notNull(), // top, trending
  addonId: text('addon_id').notNull(),
  page: integer('page').default(0),
  position: integer('position').notNull(),
  extraKey: text('extra_key').default(''), // serialized extra params
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
});

export const catalogEntriesRelations = relations(catalogEntries, ({ one }) => ({
  content: one(contents, {
    fields: [catalogEntries.contentId],
    references: [contents.id],
  }),
}));

export const metaCache = sqliteTable('meta_cache', {
  contentId: text('content_id').primaryKey().references(() => contents.id, { onDelete: 'cascade' }),
  addonId: text('addon_id').notNull(),
  metaJson: text('meta_json').notNull(), // Full JSON from addon
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
});

export const metaCacheRelations = relations(metaCache, ({ one }) => ({
  content: one(contents, {
    fields: [metaCache.contentId],
    references: [contents.id],
  }),
}));

export const streamCache = sqliteTable('stream_cache', {
  id: text('id').primaryKey(),
  contentId: text('content_id').notNull().references(() => contents.id, { onDelete: 'cascade' }),
  source: text('source').notNull(), // addon, torbox, direct
  quality: text('quality'),
  url: text('url').notNull(),
  filename: text('filename'),
  extra: text('extra', { mode: 'json' }), // infoHash, etc
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
});

// ─────────────────────────────────────────────────────────────
// User Homepage Rows Table (Personalized Content)
// ─────────────────────────────────────────────────────────────

export const userHomepageRows = sqliteTable('user_homepage_rows', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rowId: text('row_id').notNull(), // e.g., 'action-movies', 'anime-vibes'
  title: text('title').notNull(), // e.g., 'Action Movies You'll Love'
  type: text('type').notNull(), // 'catalog' | 'progress' | 'recommendations'
  catalogType: text('catalog_type'), // 'movie' | 'series' | 'anime'
  catalogId: text('catalog_id'), // 'top', 'trending', 'kitsu-anime-trending'
  source: text('source'), // 'tmdb-addon', 'community.anime.kitsu'
  extra: text('extra', { mode: 'json' }), // { genre: 'action', skip: '0' }
  priority: integer('priority').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
}, (table) => ({
  userRowUnique: unique().on(table.userId, table.rowId),
}));

export const userHomepageRowsRelations = relations(userHomepageRows, ({ one }) => ({
  user: one(users, {
    fields: [userHomepageRows.userId],
    references: [users.id],
  }),
}));

export const streamCacheRelations = relations(streamCache, ({ one }) => ({
  content: one(contents, {
    fields: [streamCache.contentId],
    references: [contents.id],
  }),
}));

export const subtitleCache = sqliteTable('subtitle_cache', {
  id: text('id').primaryKey(),
  contentId: text('content_id').notNull().references(() => contents.id, { onDelete: 'cascade' }),
  language: text('language').notNull(),
  url: text('url').notNull(),
  format: text('format').default('srt'),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
});

export const subtitleCacheRelations = relations(subtitleCache, ({ one }) => ({
  content: one(contents, {
    fields: [subtitleCache.contentId],
    references: [contents.id],
  }),
}));


// We define contentsRelations last so it can access streamCache/subtitleCache
export const contentsRelations = relations(contents, ({ many, one }) => ({
  catalogEntries: many(catalogEntries),
  history: many(history),
  metaCache: one(metaCache, {
    fields: [contents.id],
    references: [metaCache.contentId],
  }),
  streamCache: many(streamCache),
  subtitleCache: many(subtitleCache),
  episodes: many(episodes),
}));

// ─────────────────────────────────────────────────────────────
// Episodes Table (Phase 0 - Implementation Plan)
// ─────────────────────────────────────────────────────────────

export const episodes = sqliteTable('episodes', {
  id: text('id').primaryKey(),
  contentId: text('content_id').notNull().references(() => contents.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(), // e.g., tt1234567

  // Episode info
  season: integer('season').notNull(),
  episode: integer('episode').notNull(),
  title: text('title'),
  description: text('description'),
  thumbnail: text('thumbnail'),
  airDate: text('air_date'),
  runtime: integer('runtime'),

  // Cache metadata
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  contentSeasonEpisode: unique().on(table.contentId, table.season, table.episode),
}));

export const episodesRelations = relations(episodes, ({ one }) => ({
  content: one(contents, {
    fields: [episodes.contentId],
    references: [contents.id],
  }),
}));

export const searchHistory = sqliteTable('search_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  type: text('type').default('all'), // 'movie', 'series', 'all'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// User Feed State Table (for row buffering)
// ─────────────────────────────────────────────────────────────

export const userFeedState = sqliteTable('user_feed_state', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').notNull(),
  generatedRows: text('generated_rows').notNull(), // JSON array
  servedRowIds: text('served_row_ids').notNull(), // JSON array
  lastGeneratedAt: integer('last_generated_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  // Exposure memory (ring buffers)
  recentItems: text('recent_items', { mode: 'json' }).$type<string[]>().default(sql`'[]'`), // Ring buffer 200-300
  recentRowTypes: text('recent_row_types', { mode: 'json' }).$type<string[]>().default(sql`'[]'`), // Ring buffer 10-15
  // User behavior stats
  avgSessionLength: integer('avg_session_length').default(0), // seconds
  completionRate: integer('completion_rate').default(0), // percentage 0-100
  topGenres: text('top_genres', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  topLanguages: text('top_languages', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
});

export const userFeedStateRelations = relations(userFeedState, ({ one }) => ({
  user: one(users, {
    fields: [userFeedState.userId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// User Row Templates Table (Pre-generated recommendations)
// ─────────────────────────────────────────────────────────────

export const userRowTemplates = sqliteTable('user_row_templates', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Template Configuration
  position: integer('position').notNull(), // 0-127
  archetypeId: text('archetype_id').notNull(), // e.g., 'MORE_TOP_GENRE'
  title: text('title').notNull(), // e.g., 'More Action'

  // Content Filters
  contentType: text('content_type'), // 'movie' | 'series' | 'all'
  catalogType: text('catalog_type'), // 'movie' | 'series'
  catalogId: text('catalog_id').default('top'), // 'top' | 'trending'
  filters: text('filters', { mode: 'json' }).$type<{
    genre?: string;
    language?: string;
    minRating?: number;
    maxRuntime?: number;
    minRuntime?: number;
    decade?: string;
    excludeGenres?: string[];
    skip?: string;
    similarTo?: string;
    cast?: string[];
    director?: string[];
  }>(),

  // Scoring Parameters
  weight: integer('weight').default(100), // 0-200 for position adjustment
  confidence: integer('confidence').default(80), // 0-100

  // Metadata
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userPositionUnique: unique().on(table.userId, table.position),
}));

export const userRowTemplatesRelations = relations(userRowTemplates, ({ one }) => ({
  user: one(users, {
    fields: [userRowTemplates.userId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// Content Cache Table (For local content storage)
// ─────────────────────────────────────────────────────────────

export const contentCache = sqliteTable('content_cache', {
  id: text('id').primaryKey(), // External ID (e.g., tt1234567)
  type: text('type').notNull(), // 'movie' | 'series'
  name: text('name').notNull(),
  poster: text('poster'),
  background: text('background'),
  description: text('description'),
  releaseInfo: text('release_info'),
  imdbRating: text('imdb_rating'),
  runtime: text('runtime'),
  genres: text('genres', { mode: 'json' }).$type<string[]>(),
  cast: text('cast', { mode: 'json' }).$type<string[]>(),
  director: text('director', { mode: 'json' }).$type<string[]>(),
  country: text('country'),
  language: text('language'),
  popularity: integer('popularity').default(0),

  // Cache metadata
  catalogType: text('catalog_type'), // Which catalog this came from
  catalogId: text('catalog_id'),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

// ─────────────────────────────────────────────────────────────
// Playback Sessions Table (Vela 2.0)
// ─────────────────────────────────────────────────────────────

export const playbackSessions = sqliteTable('playback_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contentId: text('content_id').notNull(),
  externalId: text('external_id').notNull(),

  // Stream data
  upstreamUrl: text('upstream_url').notNull(),
  upstreamExpiry: integer('upstream_expiry', { mode: 'timestamp' }).notNull(),
  quality: text('quality').default('1080p'),
  source: text('source').notNull(), // 'torbox' | 'usenet' | 'direct' | 'scraper'

  // Resolution metadata
  infoHash: text('info_hash'),
  fileIdx: integer('file_idx'),
  filename: text('filename'),

  // Playback state
  position: integer('position').default(0),
  duration: integer('duration').default(0),
  lastHeartbeat: integer('last_heartbeat', { mode: 'timestamp' }),

  // Episode context
  season: integer('season'),
  episode: integer('episode'),
  nextEpisodeSessionId: text('next_episode_session_id'),

  // Lifecycle
  status: text('status').default('active'), // 'active' | 'paused' | 'expired' | 'error'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

export const playbackSessionsRelations = relations(playbackSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [playbackSessions.userId],
    references: [users.id],
  }),
  audioTracks: many(streamAudioTracks),
}));

// ─────────────────────────────────────────────────────────────
// Stream Audio Tracks Table (Phase 0 - Implementation Plan)
// ─────────────────────────────────────────────────────────────

export const streamAudioTracks = sqliteTable('stream_audio_tracks', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => playbackSessions.id, { onDelete: 'cascade' }),

  // Track info
  trackIndex: integer('track_index').notNull(),
  language: text('language').notNull(), // ISO 639-1 code (e.g., 'en', 'ja')
  languageName: text('language_name'), // Full name (e.g., 'English')
  codec: text('codec'), // e.g., 'aac', 'ac3', 'eac3'
  channels: text('channels'), // e.g., '5.1', 'stereo'
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),

  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  sessionTrackUnique: unique().on(table.sessionId, table.trackIndex),
}));

export const streamAudioTracksRelations = relations(streamAudioTracks, ({ one }) => ({
  session: one(playbackSessions, {
    fields: [streamAudioTracks.sessionId],
    references: [playbackSessions.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// Resolved Streams Cache Table (Vela 2.0)
// ─────────────────────────────────────────────────────────────

export const resolvedStreams = sqliteTable('resolved_streams', {
  id: text('id').primaryKey(),
  contentKey: text('content_key').notNull(), // "externalId:S01E01"

  // Stream data
  source: text('source').notNull(),
  provider: text('provider').notNull(),
  quality: text('quality').notNull(),
  streamUrl: text('stream_url').notNull(),

  // Resolution details
  infoHash: text('info_hash'),
  fileIdx: integer('file_idx'),
  filename: text('filename'),
  size: integer('size'),

  // Lifecycle
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  useCount: integer('use_count').default(0),

  // Reliability tracking
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),
  avgLatency: integer('avg_latency'),
}, (table) => ({
  contentSourceQuality: unique().on(table.contentKey, table.source, table.quality),
}));

// ─────────────────────────────────────────────────────────────
// Watch Together Tables
// ─────────────────────────────────────────────────────────────

export const watchRooms = sqliteTable('watch_rooms', {
  id: text('id').primaryKey(),
  hostUserId: text('host_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  inviteCode: text('invite_code').notNull().unique(),

  // Content being watched
  contentId: text('content_id'),
  contentTitle: text('content_title'),
  contentPoster: text('content_poster'),
  season: integer('season'),
  episode: integer('episode'),

  // Room settings
  controlMode: text('control_mode').default('anyone'), // 'host-only' | 'anyone'
  status: text('status').default('waiting'), // 'waiting' | 'active' | 'ended'
  maxMembers: integer('max_members').default(10),

  // Lifecycle
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

export const watchRoomMembers = sqliteTable('watch_room_members', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => watchRooms.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').default('guest'), // 'host' | 'guest'
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  roomUserUnique: unique().on(table.roomId, table.userId),
}));

export const watchRoomsRelations = relations(watchRooms, ({ one, many }) => ({
  host: one(users, {
    fields: [watchRooms.hostUserId],
    references: [users.id],
  }),
  members: many(watchRoomMembers),
}));

export const watchRoomMembersRelations = relations(watchRoomMembers, ({ one }) => ({
  room: one(watchRooms, {
    fields: [watchRoomMembers.roomId],
    references: [watchRooms.id],
  }),
  user: one(users, {
    fields: [watchRoomMembers.userId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// Watch Friends (Saved Connections)
// ─────────────────────────────────────────────────────────────

export const watchFriends = sqliteTable('watch_friends', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  friendUserId: text('friend_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userFriendUnique: unique().on(table.userId, table.friendUserId),
}));

export const watchFriendsRelations = relations(watchFriends, ({ one }) => ({
  user: one(users, {
    fields: [watchFriends.userId],
    references: [users.id],
  }),
  friend: one(users, {
    fields: [watchFriends.friendUserId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// Room Playback State (Polling-based sync)
// ─────────────────────────────────────────────────────────────

export const roomPlaybackState = sqliteTable('room_playback_state', {
  roomId: text('room_id').primaryKey().references(() => watchRooms.id, { onDelete: 'cascade' }),
  position: integer('position').default(0), // seconds
  isPlaying: integer('is_playing', { mode: 'boolean' }).default(false),
  lastAction: text('last_action'), // 'play' | 'pause' | 'seek'
  lastActionBy: text('last_action_by'),
  lastActionAt: integer('last_action_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const roomPlaybackStateRelations = relations(roomPlaybackState, ({ one }) => ({
  room: one(watchRooms, {
    fields: [roomPlaybackState.roomId],
    references: [watchRooms.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// Room Chat Messages
// ─────────────────────────────────────────────────────────────

export const roomChatMessages = sqliteTable('room_chat_messages', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => watchRooms.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const roomChatMessagesRelations = relations(roomChatMessages, ({ one }) => ({
  room: one(watchRooms, {
    fields: [roomChatMessages.roomId],
    references: [watchRooms.id],
  }),
  user: one(users, {
    fields: [roomChatMessages.userId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// Room Member Readiness (Sync before play)
// ─────────────────────────────────────────────────────────────

export const roomMemberReadiness = sqliteTable('room_member_readiness', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => watchRooms.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isReady: integer('is_ready', { mode: 'boolean' }).default(false),
  bufferPercent: integer('buffer_percent').default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  roomUserUnique: unique().on(table.roomId, table.userId),
}));

export const roomMemberReadinessRelations = relations(roomMemberReadiness, ({ one }) => ({
  room: one(watchRooms, {
    fields: [roomMemberReadiness.roomId],
    references: [watchRooms.id],
  }),
  user: one(users, {
    fields: [roomMemberReadiness.userId],
    references: [users.id],
  }),
}));

// ─────────────────────────────────────────────────────────────
// Stream Sessions Table (Short-lived HLS sessions for Cloudflare)
// ─────────────────────────────────────────────────────────────

export const streamSessions = sqliteTable('stream_sessions', {
  id: text('id').primaryKey(),
  contentId: text('content_id').notNull(),
  contentType: text('content_type').notNull(), // 'movie' | 'series' | 'anime'
  season: integer('season'),
  episode: integer('episode'),

  // Stream data (JSON serialized)
  streamData: text('stream_data', { mode: 'json' }).$type<{
    id: string;
    url?: string;
    hlsUrl?: string;
    quality: string;
    source: string;
    title?: string;
    cached?: boolean;
    hash?: string;
  }>().notNull(),

  upstreamUrl: text('upstream_url').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

// ─────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────

export type StreamSessionRow = typeof streamSessions.$inferSelect;
export type NewStreamSession = typeof streamSessions.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Preferences = typeof preferences.$inferSelect;
export type NewPreferences = typeof preferences.$inferInsert;

export type LibraryItem = typeof library.$inferSelect;
export type NewLibraryItem = typeof library.$inferInsert;

export type HistoryEntry = typeof history.$inferSelect;
export type NewHistoryEntry = typeof history.$inferInsert;

export type Addon = typeof addons.$inferSelect;
export type NewAddon = typeof addons.$inferInsert;

export type SystemAddon = typeof systemAddons.$inferSelect;
export type NewSystemAddon = typeof systemAddons.$inferInsert;

export type Content = typeof contents.$inferSelect;
export type NewContent = typeof contents.$inferInsert;

export type CatalogEntry = typeof catalogEntries.$inferSelect;
export type NewCatalogEntry = typeof catalogEntries.$inferInsert;

export type MetaCache = typeof metaCache.$inferSelect;
export type NewMetaCache = typeof metaCache.$inferInsert;

export type StreamCache = typeof streamCache.$inferSelect;
export type NewStreamCache = typeof streamCache.$inferInsert;

export type SubtitleCache = typeof subtitleCache.$inferSelect;
export type NewSubtitleCache = typeof subtitleCache.$inferInsert;

export type SearchHistoryEntry = typeof searchHistory.$inferSelect;
export type NewSearchHistoryEntry = typeof searchHistory.$inferInsert;

export type UserFeedState = typeof userFeedState.$inferSelect;
export type NewUserFeedState = typeof userFeedState.$inferInsert;

export type UserRowTemplate = typeof userRowTemplates.$inferSelect;
export type NewUserRowTemplate = typeof userRowTemplates.$inferInsert;

export type ContentCacheItem = typeof contentCache.$inferSelect;
export type NewContentCacheItem = typeof contentCache.$inferInsert;

// Vela 2.0 Types
export type PlaybackSessionRow = typeof playbackSessions.$inferSelect;
export type NewPlaybackSession = typeof playbackSessions.$inferInsert;

export type ResolvedStreamRow = typeof resolvedStreams.$inferSelect;
export type NewResolvedStream = typeof resolvedStreams.$inferInsert;

// Watch Together Types
export type WatchRoom = typeof watchRooms.$inferSelect;
export type NewWatchRoom = typeof watchRooms.$inferInsert;

export type WatchRoomMember = typeof watchRoomMembers.$inferSelect;
export type NewWatchRoomMember = typeof watchRoomMembers.$inferInsert;

export type WatchFriend = typeof watchFriends.$inferSelect;
export type NewWatchFriend = typeof watchFriends.$inferInsert;

export type RoomPlaybackState = typeof roomPlaybackState.$inferSelect;
export type NewRoomPlaybackState = typeof roomPlaybackState.$inferInsert;

export type RoomChatMessage = typeof roomChatMessages.$inferSelect;
export type NewRoomChatMessage = typeof roomChatMessages.$inferInsert;

export type RoomMemberReadiness = typeof roomMemberReadiness.$inferSelect;
export type NewRoomMemberReadiness = typeof roomMemberReadiness.$inferInsert;

// Phase 0 Types
export type Episode = typeof episodes.$inferSelect;
export type NewEpisode = typeof episodes.$inferInsert;

export type StreamAudioTrack = typeof streamAudioTracks.$inferSelect;
export type NewStreamAudioTrack = typeof streamAudioTracks.$inferInsert;
