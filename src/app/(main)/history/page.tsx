'use client';

import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { ContentCard } from '@/components/home/content-card';
import { motion, AnimatePresence } from 'framer-motion';

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState('watching');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Fetch items
  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('status', activeTab);
        if (search) params.set('q', search);
        
        const res = await fetch(`/api/history?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.data || []);
        }
      } catch (error) {
        console.error('History fetch failed', error);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
        fetchHistory();
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [activeTab, search]);

  return (
    <div className="min-h-screen pt-20 px-4 md:px-8 lg:px-12 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold">History</h1>
          <p className="text-muted-foreground">Manage your watch progress.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search history..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList>
          <TabsTrigger value="watching" className="gap-2">
            <Clock className="h-4 w-4" />
            Continue Watching
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Watched
          </TabsTrigger>
        </TabsList>

        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p>No items found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    layout
                  >
                    <ContentCard
                      id={item.contentId}
                      title={item.title}
                      type={item.contentType}
                      poster={item.poster}
                      progress={activeTab === 'watching' ? Math.round((item.position / item.duration) * 100) : undefined}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
