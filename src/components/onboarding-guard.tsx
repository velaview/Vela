'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/store/auth-store';

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    // Skip check if user is not authenticated or already on onboarding page
    if (!user || pathname.startsWith('/onboarding') || pathname.startsWith('/auth')) {
      setIsLoading(false);
      return;
    }

    // Check onboarding status
    const checkOnboardingStatus = async () => {
      try {
        const response = await fetch('/api/user/preferences');
        if (response.ok) {
          const data = await response.json();
          const completed = data.preferences?.onboardingCompleted || false;
          setOnboardingCompleted(completed);
          
          // Redirect to onboarding if not completed
          if (!completed && pathname !== '/onboarding') {
            router.push('/onboarding');
            return;
          }
        }
      } catch (error) {
        console.error('[OnboardingGuard] Failed to check onboarding status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, pathname, router]);

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render children if redirecting to onboarding
  if (!onboardingCompleted && !pathname.startsWith('/onboarding') && user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
