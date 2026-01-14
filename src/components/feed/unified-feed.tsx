'use client';

import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'framer-motion';
import { ContentRow } from '@/components/home/content-row';
import { Loader2 } from 'lucide-react';
import { CachedMeta } from '@/store/content-cache';
import { ContentCard } from '@/components/home/content-card';

interface FeedItem {
  id: string; // Row ID or Content ID
  title?: string; // For Rows
  items?: CachedMeta[]; // For Rows
  type?: string; // For Rows
  contentType?: string; // For Rows (from template)
  archetypeId?: string; // For Rows
  catalogType?: string;
  catalogId?: string;
  [key: string]: any; // For Content Items
}

interface UnifiedFeedProps {
  initialType: string; // 'all' | 'movie' | 'series' | 'anime'
}

export function UnifiedFeed({ initialType }: UnifiedFeedProps) {
  const [type, setType] = useState(initialType);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'rows' | 'grid' | 'dynamic' | 'template-v3' | 'catalog-v2'>('rows');

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '400px', // Load well before reaching bottom
  });

  // Reset when type changes
  useEffect(() => {
    setItems([]);
    setCursor(0);
    setHasMore(true);
    setType(initialType);
    // Trigger fetch immediately
    fetchFeed(0, initialType);
  }, [initialType]);

  // Load more when scrolling
  useEffect(() => {
    if (inView && hasMore && !loading && items.length > 0) {
      fetchFeed(cursor, type);
    }
  }, [inView, hasMore, loading, cursor, type, items.length]);

  const fetchFeed = async (pageCursor: number, currentType: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?type=${currentType}&cursor=${pageCursor}`);
      const data = await res.json();


      if (data.mode) setMode(data.mode);

      if (data.items && data.items.length > 0) {



        setItems(prev => [...prev, ...data.items]);
        if (data.nextCursor) {
          setCursor(data.nextCursor);
        } else {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Feed error:', error);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="space-y-8 min-h-[50vh]">
      <AnimatePresence mode="popLayout">
        {mode === 'rows' || mode === 'dynamic' || mode === 'template-v3' || mode === 'catalog-v2' ? (
          // ROWS MODE (For You / Catalogs)
          <div className="space-y-10">
            {items.length === 0 && !loading && (
              <div className="text-center text-muted-foreground py-20">
                No content available
              </div>
            )}
            {items.map((row, index) => {
              const rowType = row.contentType || row.type || 'movie';
              const itemNames = row.items?.slice(0, 20).map(i => i.name || (i as any).title).join(', ');


              return (
                <motion.div
                  key={`${row.id || 'row'}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ContentRow
                    title={row.title || ''}
                    type={rowType as any}
                    initialItems={row.items}
                  />
                </motion.div>
              );
            })}
          </div>
        ) : (
          // GRID MODE (Movies/Series)
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4">
            {items.map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <ContentCard
                  id={item.id}
                  title={item.name}
                  type={item.type as 'movie' | 'series' | 'anime'}
                  poster={item.poster}
                  year={item.releaseInfo ? parseInt(item.releaseInfo) : undefined}
                  rating={item.imdbRating ? parseFloat(item.imdbRating) : undefined}
                />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Loading Sentinel */}
      <div ref={ref} className="h-20 flex items-center justify-center">
        {loading && <Loader2 className="w-8 h-8 animate-spin text-primary" />}
      </div>
    </div>
  );
}
