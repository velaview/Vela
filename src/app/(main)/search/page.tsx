'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Search as SearchIcon, SlidersHorizontal, Sparkles } from 'lucide-react';
import { TopMatch } from '@/components/search/top-match';
import { ContentCard } from '@/components/home/content-card';
import { FilterBar } from '@/components/search/filter-bar';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<{
    topMatch?: any;
    movies: any[];
    series: any[];
    others: any[];
  }>({ movies: [], series: [], others: [] });

  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(48);
  const [showFilters, setShowFilters] = useState(true);

  // Filter Metadata
  const [filterMeta, setFilterMeta] = useState<{
    genres: string[];
    animeGenres: string[];
    decades: { id: string; label: string }[];
  }>({ genres: [], animeGenres: [], decades: [] });

  // Filter State
  const [activeType, setActiveType] = useState(searchParams.get('type') || 'all');
  const [activeGenre, setActiveGenre] = useState(searchParams.get('genre') || '');
  const [activeDecade, setActiveDecade] = useState(searchParams.get('decade') || '');
  const [activeRating, setActiveRating] = useState(searchParams.get('rating') || '');

  // Fetch Filters
  useEffect(() => {
    async function fetchFilters() {
      try {
        const res = await fetch('/api/search/filters');
        const data = await res.json();
        if (data.data) {
          setFilterMeta(data.data);
        }
      } catch (e) {
        console.error('Failed to fetch filters', e);
      }
    }
    fetchFilters();
  }, []);

  // Update query when URL changes
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
  }, [searchParams]);

  // Perform Search with Filters
  useEffect(() => {
    async function search() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (activeType !== 'all') params.set('type', activeType);
        if (activeGenre) params.set('genre', activeGenre);
        if (activeDecade) params.set('decade', activeDecade);
        if (activeRating) params.set('minRating', activeRating.replace('+', ''));

        const res = await fetch(`/api/search?${params.toString()}`);
        const data = await res.json();

        // Handle new API response structure
        const searchData = {
          topMatch: data.groups?.topMatch || (data.results?.length > 0 ? data.results[0] : null),
          movies: data.groups?.movies || data.results?.filter((r: any) => r.type === 'movie') || [],
          series: data.groups?.series || data.results?.filter((r: any) => r.type === 'series' || r.type === 'anime') || [],
          others: data.groups?.others || data.results?.filter((r: any) => r.type !== 'movie' && r.type !== 'series' && r.type !== 'anime') || []
        };

        setResults(searchData);
        setVisibleCount(48);

        // Pre-load streams using new v1 sessions API if needed
        const all = data.results || [];
        if (all.length > 0) {
          const topItems = all.slice(0, 12);
          // Pre-loading via v1 API
          fetch('/api/streams/preload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: topItems.map((i: any) => ({ id: i.id, type: i.type })) })
          }).catch(() => { });
        }

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      search();
    }, query ? 0 : 300);

    return () => clearTimeout(timer);
  }, [query, activeType, activeGenre, activeDecade, activeRating]);

  // Flattened results
  const allResults = useMemo(() => {
    return [
      ...(results.movies || []),
      ...(results.series || []),
      ...(results.others || [])
    ];
  }, [results]);

  // Infinite Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        setVisibleCount(prev => Math.min(prev + 48, allResults.length));
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [allResults.length]);

  const hasResults = results.topMatch || allResults.length > 0;
  const visibleResults = allResults.slice(0, visibleCount);

  return (
    <div className="min-h-screen pt-24 px-4 md:px-8 lg:px-12 pb-20 max-w-[1800px] mx-auto">

      {/* Search Header */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-[0.3em]">
              <Sparkles className="w-3 h-3" /> Explore Watchers
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter">
              {query ? `Results for "${query}"` : 'Discovery'}
            </h1>
            <p className="text-muted-foreground font-medium text-lg">
              {allResults.length} titles found matching your criteria
            </p>
          </div>
          <Button
            variant="outline"
            className={cn(
              "rounded-2xl gap-2 h-12 px-6 border-white/10 bg-white/5 hover:bg-white/10 transition-all",
              showFilters && "bg-white/10 border-white/20"
            )}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -20 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -20 }}
              className="overflow-hidden"
            >
              <FilterBar
                activeType={activeType}
                onTypeChange={setActiveType}
                activeGenre={activeGenre}
                onGenreChange={setActiveGenre}
                activeDecade={activeDecade}
                onDecadeChange={setActiveDecade}
                activeRating={activeRating}
                onRatingChange={setActiveRating}
                genres={filterMeta.genres}
                animeGenres={filterMeta.animeGenres}
                decades={filterMeta.decades}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground font-bold text-lg animate-pulse tracking-widest uppercase">Searching the multiverse...</p>
        </div>
      )}

      {/* No Results */}
      {!loading && !hasResults && (
        <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-10 border border-white/10">
            <SearchIcon className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-4xl font-black mb-4 tracking-tight">No results found</h2>
          <p className="text-muted-foreground max-w-md text-xl leading-relaxed">
            We couldn't find anything matching your criteria. Try broadening your filters or searching for something else.
          </p>
          <Button
            variant="link"
            className="mt-8 text-primary text-xl font-bold"
            onClick={() => {
              setActiveType('all');
              setActiveGenre('');
              setActiveDecade('');
              setActiveRating('');
            }}
          >
            Reset all filters
          </Button>
        </div>
      )}

      {/* Results Grid */}
      {!loading && hasResults && (
        <div className="space-y-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          {/* Top Match */}
          {results.topMatch && !activeGenre && !activeDecade && !activeRating && (
            <section>
              <TopMatch result={results.topMatch} />
            </section>
          )}

          {/* Grid */}
          <section className="space-y-12">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-8 md:gap-10">
              <AnimatePresence mode="popLayout">
                {visibleResults.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      duration: 0.4,
                      delay: (index % 16) * 0.03,
                      type: 'spring',
                      damping: 20,
                      stiffness: 100
                    }}
                  >
                    <ContentCard
                      id={item.id}
                      title={item.name}
                      type={item.type as 'movie' | 'series' | 'anime'}
                      poster={item.poster}
                      year={item.releaseInfo ? parseInt(item.releaseInfo) : undefined}
                      rating={item.imdbRating ? parseFloat(item.imdbRating) : undefined}
                      className="w-full"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {visibleCount < allResults.length && (
              <div className="flex justify-center py-24">
                <div className="w-12 h-12 rounded-full border-4 border-white/5 border-t-white/20 animate-spin" />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
