import { db, userRowTemplates, preferences, history, userFeedState, contents } from '@/lib/db';
import { eq, desc, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
    ALL_ARCHETYPES,
    RowArchetype,
    ArchetypeGroup,
    GROUP_QUOTAS
} from './archetypes';

interface UserProfile {
    userId: string;
    topGenres: string[];
    topLanguages: string[];
    topActors: string[];
    topDirectors: string[];
    preferredVibes: string[];
    recentItems: string[];
    history: any[];
    affinities: {
        genres: Record<string, number>;
        types: Record<string, number>;
        actors: Record<string, number>;
        directors: Record<string, number>;
    };
}

export class TemplateGenerator {
    private readonly TEMPLATES_PER_USER = 128;

    /**
     * Generate 128 row templates for a user
     */
    async generateTemplatesForUser(userId: string): Promise<void> {

        // 1. Load user profile
        const profile = await this.getUserProfile(userId);

        // 2. Clear existing templates
        await db.delete(userRowTemplates).where(eq(userRowTemplates.userId, userId));

        // 3. Generate templates
        const templates = this.createTemplates(profile);

        // 4. Save to database
        if (templates.length > 0) {
            // Insert in batches of 50
            const batchSize = 50;
            for (let i = 0; i < templates.length; i += batchSize) {
                const batch = templates.slice(i, i + batchSize);
                await db.insert(userRowTemplates).values(batch);
            }
        }

    }

    /**
     * Create the list of 128 templates
     */
    private createTemplates(profile: UserProfile): any[] {
        const templates: any[] = [];
        const generatedAt = new Date();
        const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

        // 1. Always start with Continue Watching (Position 0)
        templates.push({
            id: nanoid(),
            userId: profile.userId,
            position: 0,
            archetypeId: 'CONTINUE_WATCHING',
            title: 'Continue Watching',
            contentType: 'all',
            catalogType: null,
            catalogId: null,
            filters: {},
            weight: 200,
            confidence: 100,
            generatedAt,
            expiresAt,
        });

        // 2. Generate pool of templates based on distribution
        const pool: any[] = [];
        const seenTitles = new Set<string>(['Continue Watching']);
        const seenFilters = new Set<string>();

        // Helper to add to pool with variety tracking and dynamic weighting
        const addToPool = (archetypeId: string, count: number, variationFn?: (i: number) => any) => {
            const archetype = this.getArchetype(archetypeId);
            let addedCount = 0;

            for (let i = 0; i < count * 2 && addedCount < count; i++) {
                const variation = variationFn ? variationFn(i) : {};
                const title = variation.title || archetype.name;
                const filterKey = JSON.stringify(variation.filters || {});

                // Deduplicate by title and filters
                if (seenTitles.has(title) || seenFilters.has(filterKey)) continue;

                // Calculate dynamic weight based on affinity
                let affinityMultiplier = 1.0;
                if (variation.filters?.genre) {
                    affinityMultiplier = 1.0 + (profile.affinities.genres[variation.filters.genre] || 0) * 0.5;
                } else if (variation.contentType) {
                    affinityMultiplier = 1.0 + (profile.affinities.types[variation.contentType] || 0) * 0.3;
                }

                pool.push({
                    archetype,
                    ...variation,
                    title,
                    dynamicWeight: (variation.weight || archetype.priority * 100) * affinityMultiplier
                });

                seenTitles.add(title);
                seenFilters.add(filterKey);
                addedCount++;
            }
        };

        // --- Group A: Continuation ---
        addToPool('RESUME_LONG', 1);
        addToPool('FINISH_ALMOST', 1);

        // Only generate RECENTLY_SIMILAR if we have history, and only up to history length
        const historyCount = profile.history.length;
        if (historyCount > 0) {
            addToPool('RECENTLY_SIMILAR', Math.min(3, historyCount), (i) => {
                const recentItem = profile.history[i];
                return {
                    title: recentItem ? `Because you watched ${recentItem.title}` : 'Similar to your recent watches',
                    filters: { similarTo: recentItem?.contentId }
                };
            });
        }

        // --- Group B: Personalization ---
        // Top Genres (Dynamic Quotas based on affinity)
        const topGenres = profile.topGenres.slice(0, 8);
        topGenres.forEach((genre, idx) => {
            const affinity = profile.affinities.genres[genre] || 0;
            const count = Math.max(1, Math.min(3, Math.ceil(affinity * 3)));

            addToPool('MORE_TOP_GENRE', count, (i) => {
                const types = ['movie', 'series', 'anime'];
                const type = types[i % 3];
                const skip = type === 'anime' ? i * 10 : i * 20;

                return {
                    title: `More ${genre} ${type === 'anime' ? 'Anime' : type === 'movie' ? 'Movies' : 'Series'}`,
                    filters: {
                        genre,
                        skip: skip > 0 ? skip.toString() : undefined,
                        ...(type === 'anime' ? { anime: true } : {})
                    },
                    contentType: type,
                    weight: 80 + (8 - idx) * 5
                };
            });
        });

        // Star Power
        profile.topActors.slice(0, 5).forEach((actor, idx) => {
            addToPool('STAR_POWER', 1, (i) => ({
                title: `Starring ${actor}`,
                filters: { cast: [actor] },
                weight: 75 + (5 - idx) * 5
            }));
        });

        // Director's Cut
        profile.topDirectors.slice(0, 3).forEach((director, idx) => {
            addToPool('DIRECTOR_CUT', 1, () => ({
                title: `Directed by ${director}`,
                filters: { director: [director] },
                weight: 70 + (3 - idx) * 5
            }));
        });

        // Because You Watched (Diverse items from history, avoiding overlap with RECENTLY_SIMILAR)
        if (historyCount > 3) {
            const historyItems = profile.history.slice(3, 10);
            historyItems.forEach((item, idx) => {
                addToPool('BECAUSE_WATCHED', 1, () => ({
                    title: `Because you watched ${item.title}`,
                    filters: { similarTo: item.contentId },
                    weight: 85 - idx
                }));
            });
        }

        // --- Group D: Popularity ---
        const typeAffinities = profile.affinities.types;
        const types = ['movie', 'series', 'anime'];
        types.forEach(type => {
            const affinity = typeAffinities[type] || 0.3;
            const count = Math.max(1, Math.min(2, Math.ceil(affinity * 4)));

            addToPool('POPULAR_WEEK', count, (i) => ({
                title: `Popular ${type === 'anime' ? 'Anime' : type === 'movie' ? 'Movies' : 'Series'} This Week`,
                contentType: type,
                catalogId: 'trending',
                filters: { skip: (i * 20).toString() },
                weight: 70
            }));

            addToPool('TRENDING_NOW', count, (i) => ({
                title: `Trending ${type === 'anime' ? 'Anime' : type === 'movie' ? 'Movies' : 'Series'} Now`,
                contentType: type,
                catalogId: 'top',
                filters: { skip: (i * 20).toString() },
                weight: 65
            }));
        });

        // --- Group E: Discovery ---
        const discoveryGenres = ['Action', 'Comedy', 'Thriller', 'Sci-Fi', 'Horror', 'Animation', 'Drama', 'Mystery'];
        discoveryGenres.forEach(genre => {
            const affinity = profile.affinities.genres[genre] || 0;
            if (affinity < 0.2) {
                addToPool('HIDDEN_GEMS', 1, () => ({
                    title: `Hidden ${genre} Gems`,
                    filters: { minRating: 7.2, genre },
                    contentType: ['movie', 'series', 'anime'][Math.floor(Math.random() * 3)],
                    weight: 50
                }));
            }
        });

        // 3. Sort by dynamic weight + small random jitter
        const sortedPool = pool.sort((a, b) => {
            const weightA = a.dynamicWeight + (Math.random() * 15);
            const weightB = b.dynamicWeight + (Math.random() * 15);
            return weightB - weightA;
        });

        // 4. Assign positions (1 to 127)
        let position = 1;
        for (const item of sortedPool) {
            if (position >= 128) break;

            templates.push({
                id: nanoid(),
                userId: profile.userId,
                position: position++,
                archetypeId: item.archetype.id,
                title: item.title,
                contentType: item.contentType || 'all',
                catalogType: item.catalogType || (item.contentType === 'series' ? 'series' : item.contentType === 'anime' ? 'series' : 'movie'),
                catalogId: item.catalogId || 'top',
                filters: item.filters || {},
                weight: Math.round(item.dynamicWeight),
                confidence: 80,
                generatedAt,
                expiresAt,
            });
        }

        return templates;
    }

    /**
     * Get user profile with preferences and history
     */
    private async getUserProfile(userId: string): Promise<UserProfile> {
        const [prefs, recentHistory, feedState] = await Promise.all([
            db.query.preferences.findFirst({ where: eq(preferences.userId, userId) }),
            db.query.history.findMany({
                where: eq(history.userId, userId),
                orderBy: [desc(history.watchedAt)],
                limit: 100, // Increased for better affinity calculation
            }),
            db.query.userFeedState.findFirst({ where: eq(userFeedState.userId, userId) }),
        ]);

        // Calculate Affinities
        const affinities = {
            genres: {} as Record<string, number>,
            types: { movie: 0, series: 0, anime: 0 } as Record<string, number>,
            actors: {} as Record<string, number>,
            directors: {} as Record<string, number>,
        };

        // 1. Base affinities from preferences
        const preferredGenres = prefs?.preferredGenres || [];
        preferredGenres.forEach(g => affinities.genres[g] = 0.5);

        // 2. Extract from history
        const contentIds = recentHistory.map(h => h.contentId);
        const contentDetails = contentIds.length > 0
            ? await db.query.contents.findMany({ where: inArray(contents.id, contentIds) })
            : [];

        contentDetails.forEach(item => {
            // Type affinity
            if (item.type in affinities.types) {
                affinities.types[item.type] += 1;
            }

            // Genre affinity
            if (item.genres) {
                item.genres.forEach(g => {
                    affinities.genres[g] = (affinities.genres[g] || 0) + 1;
                });
            }

            // Actor affinity
            if (item.cast) {
                item.cast.slice(0, 3).forEach(actor => {
                    affinities.actors[actor] = (affinities.actors[actor] || 0) + 1;
                });
            }

            // Director affinity
            if (item.director) {
                affinities.directors[item.director] = (affinities.directors[item.director] || 0) + 1;
            }
        });

        // Normalize affinities (0.0 to 1.0)
        const totalItems = contentDetails.length || 1;
        Object.keys(affinities.types).forEach(k => affinities.types[k] /= totalItems);
        Object.keys(affinities.genres).forEach(k => affinities.genres[k] = Math.min(1.0, affinities.genres[k] / (totalItems * 0.5)));

        // Extract top items for profile
        const topActors = Object.entries(affinities.actors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(e => e[0]);

        const topDirectors = Object.entries(affinities.directors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(e => e[0]);

        const topGenres = Object.entries(affinities.genres)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(e => e[0]);

        return {
            userId,
            topGenres,
            topLanguages: feedState?.topLanguages || [],
            topActors,
            topDirectors,
            preferredVibes: prefs?.preferredVibes || [],
            recentItems: feedState?.recentItems || [],
            history: recentHistory,
            affinities
        };
    }

    private getArchetype(id: string): RowArchetype {
        return ALL_ARCHETYPES.find(a => a.id === id) || ALL_ARCHETYPES[0];
    }

    private shuffle(array: any[]): any[] {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    }
}

export const templateGenerator = new TemplateGenerator();
