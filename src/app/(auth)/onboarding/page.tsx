'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowRight, Sparkles, Wand2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { OnboardingStep } from '@/components/onboarding/onboarding-step';
import { AvatarSelector } from '@/components/onboarding/avatar-selector';
import { useUser } from '@/store/auth-store';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface OnboardingData {
  nickname: string;
  avatar: string;
  preferredTypes: string[];
  preferredGenres: string[];
  preferredVibes: string[];
  location: {
    country: string;
    city?: string;
    timezone: string;
    countryCode: string;
  } | null;
}

// ─────────────────────────────────────────────────────────────
// Data Constants
// ─────────────────────────────────────────────────────────────

const contentTypes = [
  { id: 'movie', label: 'Cinema', subheading: 'Feature films', icon: '🎬' },
  { id: 'series', label: 'Episodic', subheading: 'Binge-worthy shows', icon: '📺' },
  { id: 'anime', label: 'Anime', subheading: 'Japanese animation', icon: '🌸' },
];

const genres = [
  { id: 'action', label: 'Adrenaline', color: 'from-orange-400 to-red-500' },
  { id: 'comedy', label: 'Laughter', color: 'from-yellow-300 to-yellow-500' },
  { id: 'drama', label: 'Emotion', color: 'from-blue-400 to-indigo-500' },
  { id: 'horror', label: 'Fear', color: 'from-gray-700 to-black' },
  { id: 'romance', label: 'Love', color: 'from-pink-300 to-rose-500' },
  { id: 'sci-fi', label: 'Future', color: 'from-cyan-400 to-blue-600' },
  { id: 'thriller', label: 'Suspense', color: 'from-red-500 to-purple-600' },
  { id: 'fantasy', label: 'Magic', color: 'from-purple-400 to-fuchsia-600' },
];

const vibes = [
  { id: 'uplifting', label: 'Uplifting', icon: '☀️' },
  { id: 'intense', label: 'Intense', icon: '⚡' },
  { id: 'chill', label: 'Chill', icon: '☕' },
  { id: 'thoughtful', label: 'Deep', icon: '🧠' },
  { id: 'funny', label: 'Fun', icon: '😄' },
  { id: 'dark', label: 'Dark', icon: '🌑' },
];

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const user = useUser();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    nickname: '',
    avatar: '',
    preferredTypes: [],
    preferredGenres: [],
    preferredVibes: [],
    location: null,
  });

  // Pre-fill nickname from auth if available
  useEffect(() => {
    if (user?.displayName && !data.nickname) {
      setData(prev => ({ ...prev, nickname: user.displayName }));
    }
  }, [user]);

  // Fetch location automatically on mount or specific step
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await fetch('/api/user/location');
        if (res.ok) {
          const loc = await res.json();
          setData(prev => ({ ...prev, location: loc }));
        }
      } catch (e) {
        console.error('Location fetch failed', e);
      }
    };
    fetchLocation();
  }, []);

  const updateData = (key: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const toggleSelection = (key: 'preferredTypes' | 'preferredGenres' | 'preferredVibes', value: string) => {
    setData(prev => {
      const current = prev[key];
      const next = current.includes(value)
        ? current.filter(i => i !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const handleNext = async () => {
    if (step === 4) {
      await finishOnboarding();
    } else {
      setStep(prev => prev + 1);
    }
  };

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      // 1. Update Profile (Nickname/Avatar)
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: data.nickname,
          avatar: data.avatar,
        }),
      });

      // 2. Save Preferences
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredTypes: data.preferredTypes,
          preferredGenres: data.preferredGenres,
          preferredVibes: data.preferredVibes,
          location: data.location,
          onboardingCompleted: true,
        }),
      });

      router.push('/browse');
    } catch (error) {
      console.error('Onboarding failed', error);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return data.nickname.length > 0;
      case 1: return data.preferredTypes.length > 0;
      case 2: return data.preferredGenres.length > 0;
      case 3: return data.preferredVibes.length > 0;
      case 4: return true;
      default: return false;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-6">

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Progress Dots */}
        <div className="flex justify-center gap-3 mb-12">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-8 bg-primary" : "w-1.5 bg-muted-foreground/30",
                i < step && "bg-primary/50"
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: IDENTITY */}
          {step === 0 && (
            <OnboardingStep key="step0" isActive={step === 0}>
              <div className="text-center space-y-8">
                <div className="space-y-2">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl"
                  >
                    👋
                  </motion.div>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Let's get to know you.</h1>
                  <p className="text-xl text-muted-foreground">Pick a digital persona.</p>
                </div>

                <div className="bg-card/50 backdrop-blur-sm border rounded-3xl p-8 space-y-8">
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Your Nickname</label>
                    <Input
                      value={data.nickname}
                      onChange={(e) => updateData('nickname', e.target.value)}
                      className="text-center text-3xl font-bold h-16 bg-transparent border-0 border-b-2 border-primary/20 rounded-none focus-visible:ring-0 focus-visible:border-primary px-0 placeholder:text-muted/20"
                      placeholder="Enter name..."
                      autoFocus
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Choose an Avatar</label>
                    <AvatarSelector
                      selectedAvatar={data.avatar}
                      onSelect={(a) => updateData('avatar', a)}
                    />
                  </div>
                </div>
              </div>
            </OnboardingStep>
          )}

          {/* STEP 2: CONTENT TYPES */}
          {step === 1 && (
            <OnboardingStep key="step1" isActive={step === 1}>
              <div className="text-center space-y-8">
                <h1 className="text-4xl font-bold">What do you watch?</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {contentTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => toggleSelection('preferredTypes', type.id)}
                      className={cn(
                        "relative p-6 rounded-3xl border-2 text-left transition-all duration-300 overflow-hidden group",
                        data.preferredTypes.includes(type.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-accent/50"
                      )}
                    >
                      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{type.icon}</div>
                      <h3 className="text-xl font-bold">{type.label}</h3>
                      <p className="text-sm text-muted-foreground">{type.subheading}</p>
                    </button>
                  ))}
                </div>
              </div>
            </OnboardingStep>
          )}

          {/* STEP 3: GENRES */}
          {step === 2 && (
            <OnboardingStep key="step2" isActive={step === 2}>
              <div className="text-center space-y-8">
                <h1 className="text-4xl font-bold">Set your mood.</h1>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {genres.map((genre) => {
                    const isSelected = data.preferredGenres.includes(genre.id);
                    return (
                      <button
                        key={genre.id}
                        onClick={() => toggleSelection('preferredGenres', genre.id)}
                        className={cn(
                          "h-32 rounded-2xl relative overflow-hidden transition-all duration-300 group ring-2 ring-transparent",
                          isSelected ? "ring-primary scale-[1.02]" : "hover:scale-[1.02]"
                        )}
                      >
                        <div className={cn(
                          "absolute inset-0 bg-gradient-to-br opacity-40 transition-opacity duration-300",
                          genre.color,
                          isSelected ? "opacity-80" : "group-hover:opacity-60"
                        )} />
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                          <span className="font-bold text-white text-lg">{genre.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </OnboardingStep>
          )}

          {/* STEP 4: VIBES */}
          {step === 3 && (
            <OnboardingStep key="step3" isActive={step === 3}>
              <div className="text-center space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-500 text-sm font-medium mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Vibe Check</span>
                </div>
                <h1 className="text-4xl font-bold">How do you want to feel?</h1>

                <div className="flex flex-wrap justify-center gap-3">
                  {vibes.map((vibe) => (
                    <button
                      key={vibe.id}
                      onClick={() => toggleSelection('preferredVibes', vibe.id)}
                      className={cn(
                        "px-8 py-4 rounded-full border-2 text-lg font-medium transition-all duration-300 flex items-center gap-3",
                        data.preferredVibes.includes(vibe.id)
                          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "border-muted-foreground/20 hover:border-primary/50 hover:bg-accent"
                      )}
                    >
                      <span>{vibe.icon}</span>
                      <span>{vibe.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </OnboardingStep>
          )}

          {/* STEP 5: CONFIRMATION */}
          {step === 4 && (
            <OnboardingStep key="step4" isActive={step === 4}>
              <div className="text-center space-y-8 max-w-md mx-auto">
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wand2 className="w-12 h-12" />
                </div>
                <h1 className="text-4xl font-bold">You're all set!</h1>
                <p className="text-muted-foreground text-lg">
                  We've curated a feed just for you based on your taste for
                  <span className="text-foreground font-medium"> {data.preferredGenres.map(g => genres.find(x => x.id === g)?.label).slice(0, 2).join(', ')} </span>
                  and
                  <span className="text-foreground font-medium"> {data.preferredVibes.map(v => vibes.find(x => x.id === v)?.label).slice(0, 2).join(', ')}</span>
                  vibes.
                </p>

                {data.location && (
                  <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <span>📍</span>
                    <span>Customizing for {data.location.city || data.location.country}</span>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full text-lg h-14 rounded-full font-bold shadow-xl shadow-primary/20"
                  onClick={handleNext}
                  disabled={loading}
                >
                  {loading ? 'Setting up...' : 'Start Watching'}
                  {!loading && <PartyPopper className="ml-2 w-5 h-5" />}
                </Button>
              </div>
            </OnboardingStep>
          )}

        </AnimatePresence>

        {/* Sticky Navigation for Steps 0-3 */}
        {step < 4 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.5 } }}
            className="flex justify-end mt-12"
          >
            <Button
              size="lg"
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                "rounded-full px-8 h-14 text-lg font-medium transition-all duration-300",
                canProceed() ? "shadow-lg shadow-primary/25" : "opacity-50"
              )}
            >
              Next Step
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
