'use client';

import { useEffect, useState } from 'react';
import { Library as LibraryIcon, Loader2 } from 'lucide-react';

import { ContentCard } from '@/components/home/content-card';
import { PageHeader } from '@/components/ui/page-header';

interface LibraryItem {
  id: string;
  contentId: string;
  contentType: 'movie' | 'series' | 'anime';
  title: string;
  poster?: string;
  addedAt: string;
}

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLibrary() {
      try {
        const response = await fetch('/api/library');
        if (!response.ok) {
          console.error('Library API error:', response.status);
          setItems([]);
          return;
        }
        const data = await response.json();
        setItems(data.data || []);
      } catch (error) {
        console.error('Failed to fetch library:', error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLibrary();
  }, []);

  return (
    <div className="min-h-screen pt-20">
      <div className="px-4 py-8 md:px-8 lg:px-12">
        <PageHeader
          title="My List"
          description="Your saved movies and shows"
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LibraryIcon className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold">Your list is empty</h2>
            <p className="mt-2 text-muted-foreground">
              Add movies and shows to your list to watch later
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                id={item.contentId}
                title={item.title}
                type={item.contentType}
                poster={item.poster}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
