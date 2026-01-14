'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    Flame, Star, Clock, Calendar,
    ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, X, Info
} from 'lucide-react';

import { type ContentRating } from '@/lib/utils/content-rating';

export interface SidebarAnimeFilters {
    sort?: 'trending' | 'popular' | 'rating' | 'newest';
    genre?: string;
    contentRating?: ContentRating;
}

interface SidebarFiltersProps {
    filters: SidebarAnimeFilters;
    onFilterChange: (filters: SidebarAnimeFilters) => void;
    className?: string;
}

export function SidebarFilters({ filters, onFilterChange, className }: SidebarFiltersProps) {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        sort: true,
        genres: true,
        rating: true
    });

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const updateFilter = (key: keyof SidebarAnimeFilters, value: any) => {
        onFilterChange({ ...filters, [key]: value === filters[key] ? undefined : value });
    };

    const sorts = [
        { id: 'trending', label: 'Trending', icon: Flame },
        { id: 'popular', label: 'Most Popular', icon: Star },
        { id: 'rating', label: 'Highest Rated', icon: Star },
        { id: 'newest', label: 'Top Airing', icon: Clock },
    ];

    // Categorized Genres (from Kitsu manifest)
    const genreCategories = [
        {
            name: 'Action & Adventure',
            genres: ['Action', 'Adventure', 'Fantasy', 'Magic', 'Supernatural', 'Mecha', 'Martial Arts', 'Super Power']
        },
        {
            name: 'Comedy & Slice of Life',
            genres: ['Comedy', 'Slice of Life', 'School', 'Romance', 'Music', 'Sports', 'Parody']
        },
        {
            name: 'Dark & Thriller',
            genres: ['Horror', 'Thriller', 'Psychological', 'Mystery', 'Police', 'Vampire', 'Gore']
        },
        {
            name: 'Sci-Fi & Space',
            genres: ['Sci-Fi', 'Space', 'Mecha', 'Cyberpunk']
        },
        {
            name: 'Drama & Romance',
            genres: ['Drama', 'Romance', 'Tragedy', 'Historical', 'Friendship']
        },
        {
            name: 'Other',
            genres: ['Military', 'Game', 'Kids', 'Demons', 'Samurai', 'Harem']
        }
    ];

    // Content Rating Genre Classification (synced with actions.ts)
    const explicitGenres = ['Hentai']; // 18+ only
    const suggestiveGenres = ['Ecchi', 'Yuri', 'Yaoi', 'Harem', 'Fanservice']; // 17+ / Teen
    const allNsfwGenres = [...explicitGenres, ...suggestiveGenres];

    return (
        <div className={cn("w-full h-auto pb-10", className)}>

            <div className="space-y-6">

                {/* Header / Clear */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Filters</h3>
                    {(filters.genre || filters.contentRating) && (
                        <button
                            onClick={() => onFilterChange({ sort: filters.sort })}
                            className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Clear
                        </button>
                    )}
                </div>

                {/* Info Banner */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 flex gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                        <strong>Anime Catalogs:</strong> Aggregated from MAL, AniList, and Kitsu. Supports full filtering and sorting.
                    </div>
                </div>

                {/* Sort Section */}
                <FilterSection
                    title="Sort By"
                    isOpen={openSections.sort}
                    onToggle={() => toggleSection('sort')}
                >
                    <div className="grid grid-cols-2 gap-2">
                        {sorts.map(s => (
                            <button
                                key={s.id}
                                onClick={() => updateFilter('sort', s.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold transition-all border",
                                    filters.sort === s.id
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/20"
                                )}
                            >
                                <s.icon className="w-4 h-4" />
                                {s.label}
                            </button>
                        ))}
                    </div>
                </FilterSection>

                {/* Content Rating (Simple 2-Option System) */}
                <FilterSection
                    title="Content Rating"
                    isOpen={openSections.rating}
                    onToggle={() => toggleSection('rating')}
                >
                    <div className="grid grid-cols-3 gap-1.5">
                        <button
                            onClick={() => updateFilter('contentRating', 'safe')}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-lg text-[10px] font-bold border transition-all",
                                (filters.contentRating === 'safe' || !filters.contentRating)
                                    ? "bg-green-500/20 border-green-500/40 text-green-400"
                                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                            )}
                            title="Safe for work - Family friendly content"
                        >
                            <ShieldCheck className="w-5 h-5" />
                            <span>Safe</span>
                        </button>
                        <button
                            onClick={() => updateFilter('contentRating', 'teen')}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-lg text-[10px] font-bold border transition-all",
                                filters.contentRating === 'teen'
                                    ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"
                                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                            )}
                            title="Suggestive themes - Ecchi, Harem, etc."
                        >
                            <ShieldAlert className="w-5 h-5" />
                            <span>17+</span>
                        </button>
                        <button
                            onClick={() => updateFilter('contentRating', 'mature')}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-lg text-[10px] font-bold border transition-all",
                                filters.contentRating === 'mature'
                                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                            )}
                            title="Explicit content - Hentai"
                        >
                            <ShieldAlert className="w-5 h-5 text-red-500" />
                            <span>18+</span>
                        </button>
                    </div>
                    <div className="mt-3 space-y-1 text-[10px] text-muted-foreground">
                        <p><strong className="text-green-400">Safe:</strong> General audience</p>
                        <p><strong className="text-yellow-400">17+:</strong> Ecchi/Suggestive</p>
                        <p><strong className="text-red-400">18+:</strong> Adult content</p>
                    </div>
                </FilterSection>

                {/* Genres */}
                <FilterSection
                    title="Genres"
                    isOpen={openSections.genres}
                    onToggle={() => toggleSection('genres')}
                >
                    <div className="space-y-3">
                        {genreCategories.map(cat => (
                            <div key={cat.name} className="flex flex-wrap gap-1.5">
                                {cat.genres.map(g => (
                                    <button
                                        key={g}
                                        onClick={() => updateFilter('genre', g)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border",
                                            filters.genre === g
                                                ? "bg-primary/20 border-primary text-primary"
                                                : "bg-white/5 border-white/5 text-muted-foreground hover:border-white/20"
                                        )}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </FilterSection>

            </div>
        </div>
    );
}

function FilterSection({ title, isOpen, onToggle, children }: { title: string, isOpen: boolean, onToggle: () => void, children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between text-xs font-bold text-white/80 hover:text-white transition-colors py-1"
            >
                {title}
                {isOpen ? <ChevronUp className="w-3 h-3 opacity-50" /> : <ChevronDown className="w-3 h-3 opacity-50" />}
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-1 pb-2">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
