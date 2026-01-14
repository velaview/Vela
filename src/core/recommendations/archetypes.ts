// ─────────────────────────────────────────────────────────────
// Row Archetype Configuration
// Based on design doc: 26 archetypes grouped A-F
// ─────────────────────────────────────────────────────────────

export type ArchetypeGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface RowArchetype {
  id: string;
  name: string;
  group: ArchetypeGroup;
  priority: number; // 0-1, higher = more important
  cooldown: number; // Min rows before repeat
  minSimilarity?: number;
  excludeRecentItems?: boolean;
  requiresHistory?: boolean;
  requiresPreferences?: boolean;
}

// ─────────────────────────────────────────────────────────────
// A. Continuation & High-Intent (Highest Priority)
// ─────────────────────────────────────────────────────────────

export const CONTINUATION_ARCHETYPES: RowArchetype[] = [
  {
    id: 'CONTINUE_WATCHING',
    name: 'Continue Watching',
    group: 'A',
    priority: 1.0,
    cooldown: 0, // Always show if available
    excludeRecentItems: false,
    requiresHistory: true,
  },
  {
    id: 'RESUME_LONG',
    name: 'Resume Long Watches',
    group: 'A',
    priority: 0.95,
    cooldown: 8,
    excludeRecentItems: false,
    requiresHistory: true,
  },
  {
    id: 'FINISH_ALMOST',
    name: 'Finish What You Almost Finished',
    group: 'A',
    priority: 0.9,
    cooldown: 8,
    excludeRecentItems: false,
    requiresHistory: true,
  },
  {
    id: 'RECENTLY_SIMILAR',
    name: 'Similar to What You Just Watched',
    group: 'A',
    priority: 0.85,
    cooldown: 8,
    minSimilarity: 0.4,
    excludeRecentItems: true,
    requiresHistory: true,
  },
];

// ─────────────────────────────────────────────────────────────
// B. Strong Personalization (Content-Based)
// ─────────────────────────────────────────────────────────────

export const PERSONALIZATION_ARCHETYPES: RowArchetype[] = [
  {
    id: 'BECAUSE_WATCHED',
    name: 'Because You Watched',
    group: 'B',
    priority: 0.8,
    cooldown: 8,
    minSimilarity: 0.3,
    excludeRecentItems: true,
    requiresHistory: true,
  },
  {
    id: 'MORE_TOP_GENRE',
    name: 'More Like Your Top Genre',
    group: 'B',
    priority: 0.75,
    cooldown: 8,
    excludeRecentItems: true,
    requiresPreferences: true,
  },
  {
    id: 'MORE_TOP_LANGUAGE',
    name: 'More in Your Preferred Language',
    group: 'B',
    priority: 0.7,
    cooldown: 10,
    excludeRecentItems: true,
    requiresPreferences: true,
  },
  {
    id: 'MORE_TOP_MOOD',
    name: 'More of Your Favorite Vibe',
    group: 'B',
    priority: 0.65,
    cooldown: 10,
    excludeRecentItems: true,
    requiresPreferences: true,
  },
  {
    id: 'FROM_CREATORS',
    name: 'From Creators You Watch Often',
    group: 'B',
    priority: 0.7,
    cooldown: 10,
    excludeRecentItems: true,
    requiresHistory: true,
  },
  {
    id: 'SAME_FRANCHISE',
    name: 'More from This Universe',
    group: 'B',
    priority: 0.65,
    cooldown: 12,
    excludeRecentItems: true,
    requiresHistory: true,
  },
  {
    id: 'SAME_ERA',
    name: 'More from Your Favorite Era',
    group: 'B',
    priority: 0.6,
    cooldown: 12,
    excludeRecentItems: true,
    requiresHistory: true,
  },
  {
    id: 'STAR_POWER',
    name: 'Starring Your Favorite Actors',
    group: 'B',
    priority: 0.75,
    cooldown: 10,
    excludeRecentItems: true,
    requiresHistory: true,
  },
  {
    id: 'DIRECTOR_CUT',
    name: 'Directed by Your Favorites',
    group: 'B',
    priority: 0.7,
    cooldown: 12,
    excludeRecentItems: true,
    requiresHistory: true,
  },
];

// ─────────────────────────────────────────────────────────────
// C. Time & Behavior Aware
// ─────────────────────────────────────────────────────────────

export const BEHAVIORAL_ARCHETYPES: RowArchetype[] = [
  {
    id: 'SHORT_CONTENT',
    name: 'Quick Picks',
    group: 'C',
    priority: 0.6,
    cooldown: 10,
    excludeRecentItems: true,
  },
  {
    id: 'LONG_PICKS',
    name: 'Deep Dive Sessions',
    group: 'C',
    priority: 0.55,
    cooldown: 12,
    excludeRecentItems: true,
  },
  {
    id: 'EASY_WATCHING',
    name: 'Easy Watching',
    group: 'C',
    priority: 0.5,
    cooldown: 10,
    excludeRecentItems: true,
  },
  {
    id: 'REWATCHABLE',
    name: 'Rewatchable Favorites',
    group: 'C',
    priority: 0.45,
    cooldown: 15,
    excludeRecentItems: false,
    requiresHistory: true,
  },
];

// ─────────────────────────────────────────────────────────────
// D. Popularity & Crowd Signals (Critical for Low N)
// ─────────────────────────────────────────────────────────────

export const POPULARITY_ARCHETYPES: RowArchetype[] = [
  {
    id: 'POPULAR_WEEK',
    name: 'Popular This Week',
    group: 'D',
    priority: 0.7,
    cooldown: 8,
    excludeRecentItems: true,
  },
  {
    id: 'POPULAR_GENRES',
    name: 'Popular in Your Genres',
    group: 'D',
    priority: 0.65,
    cooldown: 8,
    excludeRecentItems: true,
    requiresPreferences: true,
  },
  {
    id: 'TRENDING_NOW',
    name: 'Trending Now',
    group: 'D',
    priority: 0.6,
    cooldown: 10,
    excludeRecentItems: true,
  },
  {
    id: 'MOST_COMPLETED',
    name: 'Most Completed Recently',
    group: 'D',
    priority: 0.55,
    cooldown: 12,
    excludeRecentItems: true,
  },
  {
    id: 'TRENDING_ANIME',
    name: 'Trending Anime',
    group: 'D',
    priority: 0.7,
    cooldown: 8,
    excludeRecentItems: true,
  },
  {
    id: 'POPULAR_ANIME_GENRES',
    name: 'Popular Anime Genres',
    group: 'D',
    priority: 0.65,
    cooldown: 8,
    excludeRecentItems: true,
  },
];

// ─────────────────────────────────────────────────────────────
// E. Discovery & Exploration
// ─────────────────────────────────────────────────────────────

export const DISCOVERY_ARCHETYPES: RowArchetype[] = [
  {
    id: 'HIDDEN_GEMS',
    name: 'Hidden Gems',
    group: 'E',
    priority: 0.5,
    cooldown: 15,
    minSimilarity: 0.3,
    excludeRecentItems: true,
  },
  {
    id: 'CRITICALLY_ACCLAIMED',
    name: 'Critically Acclaimed',
    group: 'E',
    priority: 0.55,
    cooldown: 12,
    excludeRecentItems: true,
  },
  {
    id: 'RECENTLY_ADDED',
    name: 'Recently Added',
    group: 'E',
    priority: 0.5,
    cooldown: 10,
    excludeRecentItems: true,
  },
  {
    id: 'FROM_WATCHLIST',
    name: 'From Your Watchlist Signals',
    group: 'E',
    priority: 0.6,
    cooldown: 12,
    minSimilarity: 0.3,
    excludeRecentItems: true,
  },
  {
    id: 'NEW_GENRE',
    name: "You've Never Tried This",
    group: 'E',
    priority: 0.45,
    cooldown: 15,
    excludeRecentItems: true,
  },
  {
    id: 'NEARBY_GENRE',
    name: 'From a Nearby Genre',
    group: 'E',
    priority: 0.4,
    cooldown: 15,
    minSimilarity: 0.2,
    excludeRecentItems: true,
  },
];

// ─────────────────────────────────────────────────────────────
// F. Editorial / Control Rows
// ─────────────────────────────────────────────────────────────

export const EDITORIAL_ARCHETYPES: RowArchetype[] = [
  {
    id: 'EDITORS_PICKS',
    name: "Editor's Picks",
    group: 'F',
    priority: 0.5,
    cooldown: 12,
    excludeRecentItems: true,
  },
];

// ─────────────────────────────────────────────────────────────
// All Archetypes Combined
// ─────────────────────────────────────────────────────────────

export const ALL_ARCHETYPES: RowArchetype[] = [
  ...CONTINUATION_ARCHETYPES,
  ...PERSONALIZATION_ARCHETYPES,
  ...BEHAVIORAL_ARCHETYPES,
  ...POPULARITY_ARCHETYPES,
  ...DISCOVERY_ARCHETYPES,
  ...EDITORIAL_ARCHETYPES,
];

// ─────────────────────────────────────────────────────────────
// Group Quotas (Max rows per group per batch)
// ─────────────────────────────────────────────────────────────

export const GROUP_QUOTAS: Record<ArchetypeGroup, number> = {
  A: 2, // Continuation
  B: 4, // Personalization
  C: 2, // Behavioral
  D: 2, // Popularity
  E: 1, // Discovery
  F: 1, // Editorial
};

// ─────────────────────────────────────────────────────────────
// Genre Adjacency Graph (for nearby genre discovery)
// ─────────────────────────────────────────────────────────────

export const GENRE_ADJACENCY: Record<string, string[]> = {
  Action: ['Adventure', 'Thriller', 'Sci-Fi'],
  Adventure: ['Action', 'Fantasy', 'Family'],
  Comedy: ['Romance', 'Family', 'Drama'],
  Drama: ['Romance', 'Thriller', 'Crime'],
  Horror: ['Thriller', 'Mystery', 'Sci-Fi'],
  'Sci-Fi': ['Action', 'Thriller', 'Fantasy'],
  Fantasy: ['Adventure', 'Sci-Fi', 'Family'],
  Thriller: ['Action', 'Crime', 'Mystery'],
  Romance: ['Comedy', 'Drama', 'Family'],
  Crime: ['Thriller', 'Drama', 'Mystery'],
  Mystery: ['Thriller', 'Crime', 'Horror'],
  Family: ['Comedy', 'Adventure', 'Fantasy'],
  Animation: ['Family', 'Comedy', 'Fantasy'],
  Documentary: ['History', 'Biography'],
  Biography: ['Drama', 'History'],
  History: ['Documentary', 'War'],
  War: ['Action', 'History', 'Drama'],
  Western: ['Action', 'Adventure'],
  Musical: ['Romance', 'Comedy', 'Drama'],
  Sport: ['Drama', 'Biography'],
};
