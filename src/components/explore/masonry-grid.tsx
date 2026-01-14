'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContentCard } from '@/components/home/content-card';
import { type Meta } from '@/core/streaming';
import { cn } from '@/lib/utils';

interface MasonryGridProps {
    items: Meta[];
    onLoadMore: () => void;
    hasMore: boolean;
    loading: boolean;
    onItemClick: (item: Meta) => void;
}

export function MasonryGrid({ items, onLoadMore, hasMore, loading, onItemClick }: MasonryGridProps) {
    const loaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    onLoadMore();
                }
            },
            { threshold: 0.1, rootMargin: '200px' }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loading, onLoadMore]);

    return (
        <div className="w-full">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                <AnimatePresence mode="popLayout">
                    {items.map((item, index) => (
                        <motion.div
                            key={`${item.id}-${index}`}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{
                                duration: 0.3,
                                delay: (index % 10) * 0.03,
                                ease: "easeOut"
                            }}
                            className="w-full"
                            onClick={() => onItemClick(item)}
                        >
                            <ContentCard
                                id={item.id}
                                title={item.name}
                                type={item.type as 'movie' | 'series' | 'anime'}
                                poster={item.poster}
                                year={item.releaseInfo ? parseInt(item.releaseInfo) : undefined}
                                rating={item.imdbRating ? parseFloat(item.imdbRating) : undefined}
                                className="w-full hover:scale-[1.02] transition-transform duration-300"
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Loading Indicator / Infinite Scroll Trigger */}
            <div ref={loaderRef} className="w-full py-20 flex justify-center items-center">
                {loading && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-muted-foreground text-sm font-medium animate-pulse">Loading more anime...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
