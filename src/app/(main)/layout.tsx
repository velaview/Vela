import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { OnboardingGuard } from '@/components/onboarding-guard';
import { WatchTogetherProvider, RoomOverlay } from '@/components/watch-together';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingGuard>
      <WatchTogetherProvider>
        <div className="min-h-screen bg-background">
          {/* Desktop Header - Hidden on Mobile */}
          <div className="hidden md:block">
            <Header />
          </div>

          {/* Main Content */}
          <main className="md:pt-16">
            {children}
          </main>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav />

          {/* Watch Together Room Overlay */}
          <RoomOverlay />
        </div>
      </WatchTogetherProvider>
    </OnboardingGuard>
  );
}
