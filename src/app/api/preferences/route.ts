import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { db, preferences } from '@/lib/db';
import { eq } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────
// GET - Get user preferences
// ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prefs = await db.query.preferences.findFirst({
      where: eq(preferences.userId, user.userId),
    });

    if (!prefs) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: prefs });
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// PUT - Update preferences
// ─────────────────────────────────────────────────────────────

const updateSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  language: z.string().optional(),
  autoplayNext: z.boolean().optional(),
  autoplayPreviews: z.boolean().optional(),
  defaultQuality: z.enum(['auto', '4k', '1080p', '720p', '480p']).optional(),
  subtitleLang: z.string().optional(),
  maturityLevel: z.enum(['all', 'pg', 'pg13', 'r']).optional(),
  // Phase 1.5: Taste Profile
  onboardingCompleted: z.boolean().optional(),
  preferredTypes: z.array(z.string()).optional(),
  preferredRegions: z.array(z.string()).optional(),
  preferredGenres: z.array(z.string()).optional(),
  preferredVibes: z.array(z.string()).optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const updates = validated.data;

    await db.update(preferences)
      .set(updates)
      .where(eq(preferences.userId, user.userId));

    return NextResponse.json({ message: 'Preferences updated' });
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
