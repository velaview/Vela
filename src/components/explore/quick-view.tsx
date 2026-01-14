'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Star, Calendar, Info, ArrowRight, Clock } from 'lucide-react';
import type { Meta } from '@/core/streaming';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ContentCard } from '@/components/home/content-card';
import { getAnimeCatalog } from '@/app/(main)/explore/anime/actions';

interface QuickViewProps {
    item: Meta | null;
    onClose: () => void;
}

export function QuickView({ item, onClose }: QuickViewProps) {
    const router = useRouter();
    const [similar, setSimilar] = useState<Meta[]>([]);
    const [loadingSimilar, setLoadingSimilar] = useState(false);

    // Reset state when item changes
    useEffect(() => {
        if (item) {
            setSimilar([]);
            fetchSimilar(item);
        }
    }, [item]);

    const fetchSimilar = async (currentItem: Meta) => {
        setLoadingSimilar(true);
        try {
            // Strategy: Fetch items with similar genres
            // 1. If item has genres, fetch by primary genre
            // 2. Filter for items with at least 2 overlapping genres
            // 3. Fallback to trending if no similar items found

            let similar: Meta[] = [];

            if (currentItem.genres && currentItem.genres.length > 0) {
                // Fetch by primary genre
                const primaryGenre = currentItem.genres[0];

                const genreResults = await getAnimeCatalog('anilist_trending-now', {
                    genre: primaryGenre,
                    skip: '0'
                });

                // Filter for items with overlapping genres (at least 2 in common)
                similar = genreResults.filter(item => {
                    if (item.id === currentItem.id) return false;
                    if (!item.genres || item.genres.length === 0) return false;

                    const overlap = item.genres.filter(g => currentItem.genres?.includes(g));
                    return overlap.length >= 2;
                });

            }

            // Fallback to trending if no similar items found
            if (similar.length === 0) {
                const trending = await getAnimeCatalog('anilist_trending-now', { skip: '0' });
                similar = trending.filter(i => i.id !== currentItem.id);
            }

            setSimilar(similar.slice(0, 5));
        } catch (e) {
            console.error("Failed to fetch similar items", e);
        } finally {
            setLoadingSimilar(false);
        }
    };

    if (!item) return null;

    return (
        <AnimatePresence>
            {item && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 z-50 w-full md:w-[600px] lg:w-[700px] bg-[#0a0a0a] border-l border-white/10 shadow-2xl overflow-y-auto"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 z-20 p-2 bg-black/50 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>

                        {/* Hero Section */}
                        <div className="relative h-[400px] w-full">
                            <div className="absolute inset-0">
                                <img
                                    src={item.background || item.poster}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
                            </div>

                            <div className="absolute bottom-0 left-0 p-8 w-full">
                                <motion.h2
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-4xl font-black text-white mb-4 leading-tight"
                                >
                                    {item.name}
                                </motion.h2>

                                <div className="flex items-center gap-4 text-sm font-medium text-white/80 mb-6">
                                    {item.imdbRating && (
                                        <div className="flex items-center gap-1 text-yellow-400">
                                            <Star className="w-4 h-4 fill-current" />
                                            <span>{item.imdbRating}</span>
                                        </div>
                                    )}
                                    {item.releaseInfo && (
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            <span>{item.releaseInfo}</span>
                                        </div>
                                    )}
                                    {item.runtime && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{item.runtime}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        size="lg"
                                        className="rounded-xl font-bold text-base px-8"
                                        onClick={() => router.push(`/${item.type}/${item.id}`)}
                                    >
                                        <Play className="w-5 h-5 mr-2 fill-current" /> Watch Now
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="rounded-xl font-bold text-base border-white/20 bg-white/5 hover:bg-white/10"
                                        onClick={() => router.push(`/${item.type}/${item.id}`)}
                                    >
                                        <Info className="w-5 h-5 mr-2" /> Details
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-10">

                            {/* Synopsis */}
                            <section>
                                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-primary" /> Synopsis
                                </h3>
                                <p className="text-muted-foreground leading-relaxed text-lg">
                                    {item.description || "No description available."}
                                </p>
                            </section>

                            {/* Genres */}
                            {item.genres && (
                                <section>
                                    <div className="flex flex-wrap gap-2">
                                        {item.genres.map(g => (
                                            <span key={g} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white/70">
                                                {g}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Branching: Similar Content */}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <ArrowRight className="w-5 h-5 text-primary" /> You Might Also Like
                                    </h3>
                                </div>

                                {loadingSimilar ? (
                                    <div className="flex gap-4 overflow-hidden">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-[160px] h-[240px] bg-white/5 rounded-xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {similar.map((sim) => (
                                            <ContentCard
                                                key={sim.id}
                                                id={sim.id}
                                                type={sim.type as any}
                                                title={sim.name}
                                                poster={sim.poster}
                                                rating={sim.imdbRating ? parseFloat(sim.imdbRating) : undefined}
                                                year={sim.releaseInfo ? parseInt(sim.releaseInfo) : undefined}
                                                className="w-full"
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
