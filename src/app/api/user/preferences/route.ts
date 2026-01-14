import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, preferences } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPreferences = await db.query.preferences.findFirst({
      where: (prefs, { eq }) => eq(prefs.userId, user.userId),
    });

    return NextResponse.json({
      preferences: userPreferences || {},
    });
  } catch (error) {
    console.error('[Preferences API] Error fetching preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      theme,
      language,
      autoplayNext,
      autoplayPreviews,
      defaultQuality,
      subtitleLang,
      maturityLevel,
      torboxKeyEncrypted,
      onboardingCompleted,
      preferredTypes,
      preferredRegions,
      preferredGenres,
      preferredVibes,
    } = body;

    // Upsert preferences
    const now = new Date();
    await db.insert(preferences).values({
      userId: user.userId,
      theme: theme || 'dark',
      language: language || 'en',
      autoplayNext: autoplayNext ?? true,
      autoplayPreviews: autoplayPreviews ?? true,
      defaultQuality: defaultQuality || 'auto',
      subtitleLang: subtitleLang || 'en',
      maturityLevel: maturityLevel || 'all',
      torboxKeyEncrypted,
      createdAt: now,
      updatedAt: now,
      onboardingCompleted: onboardingCompleted ?? false,
      preferredTypes: preferredTypes || [],
      preferredRegions: preferredRegions || [],
      preferredGenres: preferredGenres || [],
      preferredVibes: preferredVibes || [],
    }).onConflictDoUpdate({
      target: preferences.userId,
      set: {
        theme: theme || 'dark',
        language: language || 'en',
        autoplayNext: autoplayNext ?? true,
        autoplayPreviews: autoplayPreviews ?? true,
        defaultQuality: defaultQuality || 'auto',
        subtitleLang: subtitleLang || 'en',
        maturityLevel: maturityLevel || 'all',
        torboxKeyEncrypted,
        updatedAt: now,
        onboardingCompleted: onboardingCompleted ?? false,
        preferredTypes: preferredTypes || [],
        preferredRegions: preferredRegions || [],
        preferredGenres: preferredGenres || [],
        preferredVibes: preferredVibes || [],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Preferences API] Error saving preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
