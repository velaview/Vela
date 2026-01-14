// ─────────────────────────────────────────────────────────────
// Recommendation Engine V2
// Based on design doc with deterministic seeding and linear scoring
// ─────────────────────────────────────────────────────────────

import { db, history, preferences, contents, catalogEntries, userFeedState } from '@/lib/db';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { catalogService } from '@/core/streaming';
import {
  ALL_ARCHETYPES,
  GROUP_QUOTAS,
  GENRE_ADJACENCY,
  type RowArchetype,
  type ArchetypeGroup,
} from './archetypes';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ContentItem {
  id: string;
  name: string;
  type: 'movie' | 'series' | 'anime';
  poster?: string;
  background?: string;
  genres: string[];
  cast?: string[];
  director?: string[];
  country?: string;
  language?: string;
  releaseInfo?: string;
  imdbRating?: string;
  runtime?: string;
  description?: string;
  franchiseId?: string;
  popularity?: number;
  addedAt?: Date;
}

export interface GeneratedRow {
  id: string;
  archetypeId: string;
  title: string;
  items: ContentItem[];
  metadata: {
    confidence: number;
    reason: string;
    candidatesCount: number;
    duplicatesFiltered: number;
  };
}

export interface UserState {
  userId: string;
  recentItems: string[]; // Ring buffer 200-300
  recentRowTypes: string[]; // Ring buffer 10-15
  avgSessionLength: number;
  completionRate: number;
  topGenres: string[];
  topLanguages: string[];
  preferences?: any;
  history?: any[];
}

export interface RowGenerationContext {
  userId: string;
  batchIndex: number;
  sessionId: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

// ─────────────────────────────────────────────────────────────
// Recommendation Engine Class
// ─────────────────────────────────────────────────────────────

export class RecommendationEngineV2 {
  private readonly RECENT_ITEMS_LIMIT = 250;
  private readonly RECENT_ROW_TYPES_LIMIT = 12;
  private readonly ITEMS_PER_ROW = 12;

  /**
   * Generate a batch of 12 rows for the user
   */
  async generateBatch(context: RowGenerationContext): Promise<GeneratedRow[]> {

    // 1. Load user state & tracking
    const userState = await this.getUserState(context.userId);
    const assignedIds = new Set<string>(); // Global deduplication for THIS batch

    // 2. Select archetypes for this batch
    const selectedArchetypes = this.selectArchetypes(userState, context);

    // 3. Generate rows sequentially to ensure mathematical deduplication
    // (Parallel generation can't guarantee zero duplication easily without complex locking)
    const rows: GeneratedRow[] = [];
    for (const archetype of selectedArchetypes) {
      try {
        const row = await this.generateRow(archetype, userState, context, assignedIds);
        if (row) {
          rows.push(row);
          // Mark IDs as used
          row.items.forEach(item => assignedIds.add(item.id));
        }
      } catch (error) {
        console.error(`[RecEngine] Failed to generate row for ${archetype.id}:`, error);
      }
    }

    return rows;
  }

  /**
   * Select archetypes for this batch using weighted sampling with constraints
   */
  private selectArchetypes(userState: UserState, context: RowGenerationContext): RowArchetype[] {
    // Filter out archetypes on cooldown
    const recentTypes = userState.recentRowTypes || [];
    const availableArchetypes = ALL_ARCHETYPES.filter(archetype => {
      // Check cooldown
      const lastIndex = recentTypes.lastIndexOf(archetype.id);
      if (lastIndex !== -1 && recentTypes.length - lastIndex < archetype.cooldown) {
        return false;
      }

      // Check requirements
      if (archetype.requiresHistory && (!userState.history || userState.history.length === 0)) {
        return false;
      }
      if (archetype.requiresPreferences && !userState.preferences) {
        return false;
      }

      return true;
    });


    // Deterministic seeding
    const seed = this.hashSeed(context.userId, context.sessionId, context.batchIndex);
    const rng = this.seededRandom(seed);

    // Weighted sampling with group quotas
    const selected: RowArchetype[] = [];
    const groupCounts: Record<string, number> = {};

    // Sort by priority (with some randomness)
    const shuffled = [...availableArchetypes].sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      const randomFactor = (rng() - 0.5) * 0.1; // ±5% randomness
      return priorityDiff + randomFactor;
    });

    for (const archetype of shuffled) {
      if (selected.length >= 12) break;

      const groupCount = groupCounts[archetype.group] || 0;
      const quota = GROUP_QUOTAS[archetype.group];

      if (groupCount < quota) {
        selected.push(archetype);
        groupCounts[archetype.group] = groupCount + 1;
      }
    }

    return selected;
  }

  /**
   * Generate a single row for an archetype
   */
  private async generateRow(
    archetype: RowArchetype,
    userState: UserState,
    context: RowGenerationContext,
    assignedIds: Set<string>
  ): Promise<GeneratedRow | null> {
    // 1. Get candidates (filtered by assignedIds)
    const candidates = await this.getCandidates(archetype, userState, context, assignedIds);

    if (candidates.length === 0) {
      return null;
    }

    // 2. Score candidates
    const scored = candidates.map(item => ({
      item,
      score: this.scoreItem(item, archetype, userState, context),
    }));

    // 3. Sort by score
    scored.sort((a, b) => b.score - a.score);

    // 4. Apply in-row diversification
    const selected = this.diversifySelection(scored.map(s => s.item), archetype);

    if (selected.length === 0) {
      return null;
    }

    // 5. Build row
    const row: GeneratedRow = {
      id: `${archetype.id}-${context.batchIndex}`,
      archetypeId: archetype.id,
      title: this.getRowTitle(archetype, userState),
      items: selected,
      metadata: {
        confidence: archetype.priority,
        reason: this.getRowReason(archetype, userState),
        candidatesCount: candidates.length,
        duplicatesFiltered: candidates.length - selected.length,
      },
    };

    return row;
  }

  /**
   * Get candidate items for an archetype
   */
  private async getCandidates(
    archetype: RowArchetype,
    userState: UserState,
    context: RowGenerationContext,
    assignedIds: Set<string>
  ): Promise<ContentItem[]> {
    const recentItems = new Set([...userState.recentItems || [], ...Array.from(assignedIds)]);

    switch (archetype.id) {
      case 'CONTINUE_WATCHING':
        return this.getContinueWatchingCandidates(userState, recentItems);

      case 'RESUME_LONG':
        return this.getResumeLongCandidates(userState, recentItems);

      case 'FINISH_ALMOST':
        return this.getFinishAlmostCandidates(userState, recentItems);

      case 'RECENTLY_SIMILAR':
      case 'BECAUSE_WATCHED':
        return this.getSimilarToCandidates(userState, recentItems, archetype.minSimilarity || 0.3);

      case 'MORE_TOP_GENRE':
        return this.getTopGenreCandidates(userState, recentItems);

      case 'MORE_TOP_LANGUAGE':
        return this.getTopLanguageCandidates(userState, recentItems);

      case 'MORE_TOP_MOOD':
        return this.getTopMoodCandidates(userState, recentItems);

      case 'FROM_CREATORS':
        return this.getFromCreatorsCandidates(userState, recentItems);

      case 'SAME_FRANCHISE':
        return this.getSameFranchiseCandidates(userState, recentItems);

      case 'SAME_ERA':
        return this.getSameEraCandidates(userState, recentItems);

      case 'SHORT_CONTENT':
        return this.getShortContentCandidates(userState, recentItems);

      case 'LONG_PICKS':
        return this.getLongPicksCandidates(userState, recentItems);

      case 'EASY_WATCHING':
        return this.getEasyWatchingCandidates(userState, recentItems);

      case 'REWATCHABLE':
        return this.getRewatchableCandidates(userState, recentItems);

      case 'POPULAR_WEEK':
      case 'TRENDING_NOW':
        return this.getPopularCandidates(userState, recentItems);

      case 'POPULAR_GENRES':
        return this.getPopularInGenresCandidates(userState, recentItems);

      case 'MOST_COMPLETED':
        return this.getMostCompletedCandidates(userState, recentItems);

      case 'HIDDEN_GEMS':
        return this.getHiddenGemsCandidates(userState, recentItems);

      case 'CRITICALLY_ACCLAIMED':
        return this.getCriticallyAcclaimedCandidates(userState, recentItems);

      case 'RECENTLY_ADDED':
        return this.getRecentlyAddedCandidates(userState, recentItems);

      case 'FROM_WATCHLIST':
        return this.getFromWatchlistCandidates(userState, recentItems);

      case 'NEW_GENRE':
        return this.getNewGenreCandidates(userState, recentItems);

      case 'NEARBY_GENRE':
        return this.getNearbyGenreCandidates(userState, recentItems);

      case 'EDITORS_PICKS':
        return this.getEditorsPicksCandidates(userState, recentItems);

      default:
        console.warn(`[RecEngine] Unknown archetype: ${archetype.id}`);
        return [];
    }
  }

  /**
   * Score an item using linear combination
   */
  private scoreItem(
    item: ContentItem,
    archetype: RowArchetype,
    userState: UserState,
    context: RowGenerationContext
  ): number {
    const contentSim = this.contentSimilarity(item, userState);
    const popularity = this.normalizePopularity(item.popularity || 0);
    const freshness = this.freshness(item.addedAt);
    const exposurePenalty = 0; // Already filtered in candidates

    const score =
      contentSim * 1.0 +
      popularity * 0.3 +
      freshness * 0.2 -
      exposurePenalty * 0.5;

    return score;
  }

  /**
   * Content similarity (Jaccard + language + era)
   */
  private contentSimilarity(item: ContentItem, userState: UserState): number {
    let score = 0;

    // Genre overlap (Jaccard)
    if (userState.topGenres && userState.topGenres.length > 0 && item.genres) {
      const intersection = item.genres.filter(g => userState.topGenres.includes(g)).length;
      const union = new Set([...userState.topGenres, ...item.genres]).size;
      score += union > 0 ? intersection / union : 0;
    }

    // Language match
    if (userState.topLanguages && userState.topLanguages.length > 0 && item.language) {
      if (userState.topLanguages.includes(item.language)) {
        score += 0.5;
      }
    }

    // Era match (simplified)
    const year = parseInt(item.releaseInfo || '0');
    if (year >= 2020) score += 0.3; // Recent content boost

    return Math.min(score, 1.0);
  }

  /**
   * Normalize popularity to 0-1
   */
  private normalizePopularity(popularity: number): number {
    // Assuming popularity is in range 0-100
    return Math.min(popularity / 100, 1.0);
  }

  /**
   * Freshness score based on addedAt
   */
  private freshness(addedAt?: Date): number {
    if (!addedAt) return 0;
    const ageInDays = (Date.now() - addedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < 7) return 1.0;
    if (ageInDays < 30) return 0.7;
    if (ageInDays < 90) return 0.4;
    return 0.1;
  }

  /**
   * In-row diversification: max 2 per genre, 1 per franchise/creator
   */
  private diversifySelection(candidates: ContentItem[], archetype: RowArchetype): ContentItem[] {
    const selected: ContentItem[] = [];
    const genreCounts: Record<string, number> = {};
    const franchiseSeen = new Set<string>();
    const creatorSeen = new Set<string>();

    for (const item of candidates) {
      if (selected.length >= this.ITEMS_PER_ROW) break;

      // Check genre constraint
      let genreOk = true;
      if (item.genres) {
        for (const genre of item.genres) {
          if ((genreCounts[genre] || 0) >= 2) {
            genreOk = false;
            break;
          }
        }
      }

      // Check franchise constraint
      if (item.franchiseId && franchiseSeen.has(item.franchiseId)) {
        continue;
      }

      // Check creator constraint
      let creatorOk = true;
      if (item.director) {
        for (const dir of item.director) {
          if (creatorSeen.has(dir)) {
            creatorOk = false;
            break;
          }
        }
      }

      if (genreOk && creatorOk) {
        selected.push(item);

        // Update counts
        if (item.genres) {
          item.genres.forEach(g => {
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          });
        }
        if (item.franchiseId) {
          franchiseSeen.add(item.franchiseId);
        }
        if (item.director) {
          item.director.forEach(d => creatorSeen.add(d));
        }
      }
    }

    return selected;
  }

  /**
   * Get user state from database
   */
  private async getUserState(userId: string): Promise<UserState> {
    const [prefs, recentHistory, feedState] = await Promise.all([
      db.query.preferences.findFirst({
        where: eq(preferences.userId, userId),
      }),
      db.query.history.findMany({
        where: eq(history.userId, userId),
        with: {
          content: true
        },
        orderBy: [desc(history.watchedAt)],
        limit: 50,
      }),
      db.query.userFeedState.findFirst({
        where: eq(userFeedState.userId, userId),
      }),
    ]);

    // Calculate top genres and languages from history
    const topGenres = this.extractTopGenres(recentHistory);
    const topLanguages = this.extractTopLanguages(recentHistory);

    return {
      userId,
      recentItems: feedState?.recentItems || [],
      recentRowTypes: feedState?.recentRowTypes || [],
      avgSessionLength: feedState?.avgSessionLength || 0,
      completionRate: feedState?.completionRate || 0,
      topGenres: feedState?.topGenres || topGenres,
      topLanguages: feedState?.topLanguages || topLanguages,
      preferences: prefs,
      history: recentHistory,
    };
  }

  /**
   * Extract top genres from history
   */
  private extractTopGenres(history: any[]): string[] {
    const genreCounts: Record<string, number> = {};

    // Analyze history entries that were completed or significantly watched
    history.forEach(entry => {
      const itemGenres = entry.content?.genres;
      if (itemGenres && Array.isArray(itemGenres)) {
        itemGenres.forEach(g => {
          // Weight by watch completion
          const weight = entry.completed ? 1.5 : (entry.duration > 0 ? (entry.position / entry.duration) + 0.5 : 0.5);
          genreCounts[g] = (genreCounts[g] || 0) + weight;
        });
      }
    });

    // Sort and return top 5
    return Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0]);
  }

  /**
   * Extract top languages from history
   */
  private extractTopLanguages(history: any[]): string[] {
    const langCounts: Record<string, number> = {};
    history.forEach(entry => {
      const lang = entry.content?.language;
      if (lang) {
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      }
    });
    return Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0]);
  }

  /**
   * Deterministic hash for seeding
   */
  private hashSeed(userId: string, sessionId: string, batchIndex: number): number {
    const str = `${userId}-${sessionId}-${batchIndex}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  /**
   * Get row title based on archetype and user state
   */
  private getRowTitle(archetype: RowArchetype, userState: UserState): string {
    // Customize titles based on user data
    switch (archetype.id) {
      case 'MORE_TOP_GENRE':
        const topGenre = userState.topGenres?.[0] || 'Action';
        return `More ${topGenre}`;
      case 'MORE_TOP_LANGUAGE':
        const topLang = userState.topLanguages?.[0] || 'English';
        return `More in ${topLang}`;
      default:
        return archetype.name;
    }
  }

  /**
   * Get row reason/description
   */
  private getRowReason(archetype: RowArchetype, userState: UserState): string {
    switch (archetype.group) {
      case 'A':
        return 'Continue where you left off';
      case 'B':
        return 'Based on your taste';
      case 'C':
        return 'Matched to your viewing habits';
      case 'D':
        return 'Popular with everyone';
      case 'E':
        return 'Discover something new';
      case 'F':
        return 'Curated for you';
      default:
        return 'Recommended';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Candidate Generation Methods (Stubs - to be implemented)
  // ─────────────────────────────────────────────────────────────

  private async getContinueWatchingCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Get incomplete items from history
    const incomplete = userState.history?.filter(h => !h.completed && h.position > 0) || [];
    return this.historyToContentItems(incomplete);
  }

  private async getResumeLongCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Get items with runtime > 40min that are paused
    const longPaused = userState.history?.filter(h => {
      const runtime = parseInt(h.duration?.toString() || '0');
      return !h.completed && h.position > 0 && runtime >= 2400; // 40 min
    }) || [];
    return this.historyToContentItems(longPaused);
  }

  private async getFinishAlmostCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Get items 70%+ watched but not completed
    const almostDone = userState.history?.filter(h => {
      const progress = h.duration > 0 ? h.position / h.duration : 0;
      return !h.completed && progress >= 0.7;
    }) || [];
    return this.historyToContentItems(almostDone);
  }

  private async getSimilarToCandidates(userState: UserState, recentItems: Set<string>, minSim: number): Promise<ContentItem[]> {
    // Get items similar to recently watched
    // For now, return top items from catalog
    return this.getTopCatalogItems(recentItems, 50);
  }

  private async getTopGenreCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    const topGenre = userState.topGenres?.[0] || userState.preferences?.preferredGenres?.[0];
    if (!topGenre) return [];

    const items = await catalogService.getCatalog('movie', 'top', { genre: topGenre });
    return this.catalogToContentItems(items, recentItems);
  }

  private async getTopLanguageCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Fetch items in user's top language
    return this.getTopCatalogItems(recentItems, 50);
  }

  private async getTopMoodCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    const topVibe = userState.preferences?.preferredVibes?.[0];
    if (!topVibe) return [];

    // Map vibes to genres
    const genreMap: Record<string, string> = {
      'Dark & Gritty': 'Thriller',
      'Light & Fun': 'Comedy',
      'Epic & Grand': 'Adventure',
      'Emotional & Deep': 'Drama',
    };

    const genre = genreMap[topVibe] || 'Drama';
    const items = await catalogService.getCatalog('movie', 'top', { genre });
    return this.catalogToContentItems(items, recentItems);
  }

  private async getFromCreatorsCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Get items from frequently watched directors/actors
    return this.getTopCatalogItems(recentItems, 50);
  }

  private async getSameFranchiseCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Get items from same franchise/universe
    return this.getTopCatalogItems(recentItems, 50);
  }

  private async getSameEraCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Get items from user's preferred decade
    return this.getTopCatalogItems(recentItems, 50);
  }

  private async getShortContentCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    const items = await catalogService.getCatalog('series', 'top', { genre: 'Comedy' });
    const contentItems = this.catalogToContentItems(items, recentItems);
    return contentItems.filter(item => {
      const runtime = parseInt(item.runtime || '0');
      return runtime > 0 && runtime <= 30;
    });
  }

  private async getLongPicksCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    const items = await catalogService.getCatalog('movie', 'top', {});
    const contentItems = this.catalogToContentItems(items, recentItems);
    return contentItems.filter(item => {
      const runtime = parseInt(item.runtime || '0');
      return runtime >= 120;
    });
  }

  private async getEasyWatchingCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    const items = await catalogService.getCatalog('series', 'top', { genre: 'Comedy' });
    return this.catalogToContentItems(items, recentItems);
  }

  private async getRewatchableCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Get completed items from history
    const completed = userState.history?.filter(h => h.completed) || [];
    return this.historyToContentItems(completed);
  }

  private async getPopularCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    const items = await catalogService.getCatalog('movie', 'top', {});
    return this.catalogToContentItems(items, recentItems);
  }

  private async getPopularInGenresCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    const topGenre = userState.topGenres?.[0] || userState.preferences?.preferredGenres?.[0] || 'Action';
    const items = await catalogService.getCatalog('movie', 'top', { genre: topGenre });
    return this.catalogToContentItems(items, recentItems);
  }

  private async getMostCompletedCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // For now, return top items
    return this.getTopCatalogItems(recentItems, 50);
  }

  private async getHiddenGemsCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Low popularity + high rating
    const items = await this.getTopCatalogItems(recentItems, 100);
    return items.filter(item => {
      const rating = parseFloat(item.imdbRating || '0');
      return rating >= 7.5;
    }).slice(20, 50); // Skip top 20, get next 30
  }

  private async getCriticallyAcclaimedCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    const items = await this.getTopCatalogItems(recentItems, 100);
    return items.filter(item => {
      const rating = parseFloat(item.imdbRating || '0');
      return rating >= 8.0;
    });
  }

  private async getRecentlyAddedCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Get items added in last 30 days
    const items = await this.getTopCatalogItems(recentItems, 50);
    return items.filter(item => {
      if (!item.addedAt) return false;
      const ageInDays = (Date.now() - item.addedAt.getTime()) / (1000 * 60 * 60 * 24);
      return ageInDays <= 30;
    });
  }

  private async getFromWatchlistCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Get items similar to watchlist
    return this.getTopCatalogItems(recentItems, 50);
  }

  private async getNewGenreCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Get items from genres user hasn't tried
    const watchedGenres = new Set(userState.topGenres || []);
    const allGenres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
    const newGenres = allGenres.filter(g => !watchedGenres.has(g));

    if (newGenres.length === 0) return [];

    const randomGenre = newGenres[Math.floor(Math.random() * newGenres.length)];
    const items = await catalogService.getCatalog('movie', 'top', { genre: randomGenre });
    return this.catalogToContentItems(items, recentItems);
  }

  private async getNearbyGenreCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    const topGenre = userState.topGenres?.[0] || userState.preferences?.preferredGenres?.[0];
    if (!topGenre) return [];

    const nearbyGenres = GENRE_ADJACENCY[topGenre] || [];
    if (nearbyGenres.length === 0) return [];

    const randomNearby = nearbyGenres[Math.floor(Math.random() * nearbyGenres.length)];
    const items = await catalogService.getCatalog('movie', 'top', { genre: randomNearby });
    return this.catalogToContentItems(items, recentItems);
  }

  private async getEditorsPicksCandidates(userState: UserState, recentItems: Set<string>): Promise<ContentItem[]> {
    // Curated editorial picks
    return this.getTopCatalogItems(recentItems, 50);
  }

  // ─────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────

  private async getTopCatalogItems(recentItems: Set<string>, limit: number): Promise<ContentItem[]> {
    const items = await catalogService.getCatalog('movie', 'top', {});
    return this.catalogToContentItems(items, recentItems).slice(0, limit);
  }

  private catalogToContentItems(catalogItems: any[], recentItems: Set<string>): ContentItem[] {
    return catalogItems
      .filter(item => !recentItems.has(item.id))
      .map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        poster: item.poster,
        background: item.background,
        genres: item.genres || [],
        cast: item.cast || [],
        director: item.director || [],
        country: item.country,
        language: item.language,
        releaseInfo: item.releaseInfo,
        imdbRating: item.imdbRating,
        runtime: item.runtime,
        description: item.description,
        popularity: parseFloat(item.imdbRating || '0') * 10, // Simple popularity proxy
      }));
  }

  private historyToContentItems(historyItems: any[]): ContentItem[] {
    return historyItems.map(item => ({
      id: item.contentId,
      name: item.title,
      type: item.contentType,
      poster: item.poster,
      genres: [],
      runtime: item.duration?.toString(),
    }));
  }
}

export const recommendationEngineV2 = new RecommendationEngineV2();
