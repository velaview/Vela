import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { HeroBanner } from '@/components/home/hero-banner';
import { ContinueWatchingRow } from '@/components/home/continue-watching-row';
import { UnifiedFeed } from '@/components/feed/unified-feed';
import { getCurrentUser } from '@/lib/auth';
import { db, preferences } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const metadata = {
  title: 'Home',
};

async function getOnboardingStatus(userId: string) {
  const prefs = await db.query.preferences.findFirst({
    where: eq(preferences.userId, userId),
    columns: { onboardingCompleted: true }
  });
  return prefs?.onboardingCompleted ?? false;
}

export default async function BrowsePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const completed = await getOnboardingStatus(user.userId);
  if (!completed) {
    redirect('/onboarding');
  }

  return (
    <div className="relative min-h-screen pb-20">
      {/* Hero Banner */}
      <Suspense fallback={<div className="h-[85vh] animate-pulse bg-muted" />}>
        <HeroBanner />
      </Suspense>

      {/* Content Rows */}
      <div className="-mt-20 relative z-10 space-y-10 px-4 md:px-8 lg:px-12">
        {/* Continue Watching - Client only to avoid hydration issues */}
        <Suspense fallback={null}>
          <ContinueWatchingRow />
        </Suspense>

        {/* The Unified Feed Engine */}
        <UnifiedFeed initialType="all" />

        {/* Footer spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}
