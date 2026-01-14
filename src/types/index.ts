// ─────────────────────────────────────────────────────────────
// Content Types
// ─────────────────────────────────────────────────────────────

export type ContentType = 'movie' | 'series' | 'anime';

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  year?: number;
  poster?: string;
  backdrop?: string;
  logo?: string;
  description?: string;
  rating?: number;
  runtime?: number; // in minutes
  genres?: string[];
  releaseDate?: string;
}

export interface Movie extends ContentItem {
  type: 'movie';
}

export interface Series extends ContentItem {
  type: 'series';
  seasons?: number;
  episodes?: number;
}

export interface Anime extends ContentItem {
  type: 'anime';
  seasons?: number;
  episodes?: number;
  status?: 'ongoing' | 'completed' | 'upcoming';
}

// ─────────────────────────────────────────────────────────────
// Episode Types
// ─────────────────────────────────────────────────────────────

export interface Episode {
  id: string;
  seriesId: string;
  season: number;
  episode: number;
  title: string;
  description?: string;
  thumbnail?: string;
  runtime?: number;
  releaseDate?: string;
}

export interface Season {
  number: number;
  episodes: Episode[];
}

// ─────────────────────────────────────────────────────────────
// Stream Types
// ─────────────────────────────────────────────────────────────

export interface Stream {
  id: string;
  title: string;
  url?: string;
  infoHash?: string;
  fileIdx?: number;
  quality?: string;
  size?: string;
  seeders?: number;
  source?: string;
  cached?: boolean;
}

// ─────────────────────────────────────────────────────────────
// User Types
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  language: string;
  autoplayNext: boolean;
  autoplayPreviews: boolean;
  defaultQuality: 'auto' | '4k' | '1080p' | '720p' | '480p';
  subtitleLanguage: string;
  maturityLevel: 'all' | 'pg' | 'pg13' | 'r';
}

// ─────────────────────────────────────────────────────────────
// Library Types
// ─────────────────────────────────────────────────────────────

export interface LibraryItem {
  id: string;
  userId: string;
  contentId: string;
  contentType: ContentType;
  title: string;
  poster?: string;
  addedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// Watch History Types
// ─────────────────────────────────────────────────────────────

export interface WatchHistoryEntry {
  id: string;
  userId: string;
  contentId: string;
  contentType: ContentType;
  title: string;
  poster?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  position: number; // seconds
  duration: number; // seconds
  percentage: number; // 0-100
  completed: boolean;
  watchedAt: Date;
}

// ─────────────────────────────────────────────────────────────
// Addon Types
// ─────────────────────────────────────────────────────────────

export interface AddonManifest {
  id: string;
  version: string;
  name: string;
  description?: string;
  logo?: string;
  background?: string;
  resources: string[];
  types: string[];
  catalogs?: AddonCatalog[];
  idPrefixes?: string[];
}

export interface AddonCatalog {
  type: string;
  id: string;
  name: string;
  extra?: AddonCatalogExtra[];
}

export interface AddonCatalogExtra {
  name: string;
  isRequired?: boolean;
  options?: string[];
}

export interface InstalledAddon {
  id: string;
  userId: string;
  addonId: string;
  manifestUrl: string;
  manifest: AddonManifest;
  enabled: boolean;
  position: number;
}

// ─────────────────────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
