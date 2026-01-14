import { UnifiedFeed } from '@/components/feed/unified-feed';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

interface ExplorePageProps {
  params: Promise<{ type: string }>;
}

export const generateMetadata = async ({ params }: ExplorePageProps) => {
  const { type } = await params;
  const title = type.charAt(0).toUpperCase() + type.slice(1);
  return {
    title: `${title} - Watchers`,
  };
};

export default async function ExplorePage({ params }: ExplorePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { type } = await params;
  
  // Validate type
  const validTypes = ['movie', 'series', 'anime'];
  if (!validTypes.includes(type)) {
    notFound();
  }

  return (
    <div className="min-h-screen pt-20 px-4 md:px-8 lg:px-12 pb-20">
      <h1 className="text-3xl font-bold mb-6 capitalize">{type === 'movie' ? 'Movies' : type}</h1>
      <UnifiedFeed initialType={type} />
    </div>
  );
}
