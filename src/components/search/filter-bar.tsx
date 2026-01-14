'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Star, Calendar, Filter, X } from 'lucide-react';

interface FilterBarProps {
    activeType: string;
    onTypeChange: (type: string) => void;
    activeGenre: string;
    onGenreChange: (genre: string) => void;
    activeDecade: string;
    onDecadeChange: (decade: string) => void;
    activeRating: string;
    onRatingChange: (rating: string) => void;
    genres: string[];
    animeGenres: string[];
    decades: { id: string; label: string }[];
}

const types = [
    { id: 'all', label: 'All Content' },
    { id: 'movie', label: 'Movies' },
    { id: 'series', label: 'TV Shows' },
    { id: 'anime', label: 'Anime' },
];

const ratings = ['8+', '7+', '6+', '5+'];

export function FilterBar({
    activeType,
    onTypeChange,
    activeGenre,
    onGenreChange,
    activeDecade,
    onDecadeChange,
    activeRating,
    onRatingChange,
    genres,
    animeGenres,
    decades,
}: FilterBarProps) {
    const currentGenres = activeType === 'anime' ? animeGenres : genres;

    return (
        <div className="space-y-10 mb-16 p-8 bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-xl">
            {/* Header with Clear All */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Filter className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Refine Search</h2>
                </div>
                {(activeGenre || activeDecade || activeRating || activeType !== 'all') && (
                    <button
                        onClick={() => {
                            onTypeChange('all');
                            onGenreChange('');
                            onDecadeChange('');
                            onRatingChange('');
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-widest"
                    >
                        <X className="w-3 h-3" /> Clear All
                    </button>
                )}
            </div>

            {/* Type Selection */}
            <div className="flex flex-wrap gap-3">
                {types.map((type) => (
                    <button
                        key={type.id}
                        onClick={() => onTypeChange(type.id)}
                        className={cn(
                            'px-6 py-3 rounded-2xl text-sm font-bold transition-all border',
                            activeType === type.id
                                ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                                : 'bg-white/5 border-white/5 text-muted-foreground hover:border-white/20 hover:bg-white/10'
                        )}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {/* Genre Section */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        Genres
                    </h3>
                    <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                        <button
                            onClick={() => onGenreChange('')}
                            className={cn(
                                'px-4 py-2 rounded-xl text-xs font-bold transition-all border',
                                activeGenre === ''
                                    ? 'bg-white text-black border-white'
                                    : 'bg-white/5 border-white/5 text-muted-foreground hover:border-white/20'
                            )}
                        >
                            All Genres
                        </button>
                        {currentGenres.map((genre) => (
                            <button
                                key={genre}
                                onClick={() => onGenreChange(genre)}
                                className={cn(
                                    'px-4 py-2 rounded-xl text-xs font-bold transition-all border',
                                    activeGenre === genre
                                        ? 'bg-white text-black border-white'
                                        : 'bg-white/5 border-white/5 text-muted-foreground hover:border-white/20'
                                )}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Decade Section */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        Release Period
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => onDecadeChange('')}
                            className={cn(
                                'px-4 py-2 rounded-xl text-xs font-bold transition-all border',
                                activeDecade === ''
                                    ? 'bg-white text-black border-white'
                                    : 'bg-white/5 border-white/5 text-muted-foreground hover:border-white/20'
                            )}
                        >
                            Any Time
                        </button>
                        {decades.map((d) => (
                            <button
                                key={d.id}
                                onClick={() => onDecadeChange(d.id)}
                                className={cn(
                                    'px-4 py-2 rounded-xl text-xs font-bold transition-all border',
                                    activeDecade === d.id
                                        ? 'bg-white text-black border-white'
                                        : 'bg-white/5 border-white/5 text-muted-foreground hover:border-white/20'
                                )}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Rating Section */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                        Minimum Rating
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => onRatingChange('')}
                            className={cn(
                                'px-4 py-2 rounded-xl text-xs font-bold transition-all border',
                                activeRating === ''
                                    ? 'bg-white text-black border-white'
                                    : 'bg-white/5 border-white/5 text-muted-foreground hover:border-white/20'
                            )}
                        >
                            Any Rating
                        </button>
                        {ratings.map((rating) => (
                            <button
                                key={rating}
                                onClick={() => onRatingChange(rating)}
                                className={cn(
                                    'px-4 py-2 rounded-xl text-xs font-bold transition-all border',
                                    activeRating === rating
                                        ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20'
                                        : 'bg-white/5 border-white/5 text-muted-foreground hover:border-yellow-500/40'
                                )}
                            >
                                <div className="flex items-center gap-1">
                                    <Star className={cn("w-3 h-3", activeRating === rating ? "fill-current" : "")} />
                                    {rating}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
