import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ContentDetails } from '@/components/content/content-details';
import { ContentDetailsSkeleton } from '@/components/content/content-details-skeleton';

interface PageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { type, id } = await params;
  return {
    title: `${type.charAt(0).toUpperCase() + type.slice(1)} - ${id}`,
  };
}

export default async function ContentPage({ params }: PageProps) {
  const { type, id } = await params;

  // Validate type
  if (!['movie', 'series', 'anime'].includes(type)) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <Suspense fallback={<ContentDetailsSkeleton />}>
        <ContentDetails type={type as 'movie' | 'series' | 'anime'} id={id} />
      </Suspense>
    </div>
  );
}
