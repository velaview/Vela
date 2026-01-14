import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getCurrentUser } from '@/lib/auth';
import { db, library } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────
// GET - Get user's library
// ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await db.query.library.findMany({
      where: eq(library.userId, user.userId),
      orderBy: (library, { desc }) => [desc(library.addedAt)],
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error('Failed to get library:', error);
    return NextResponse.json(
      { error: 'Failed to get library' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// POST - Add to library
// ─────────────────────────────────────────────────────────────

const addSchema = z.object({
  contentId: z.string(),
  contentType: z.enum(['movie', 'series', 'anime']),
  title: z.string(),
  poster: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = addSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { contentId, contentType, title, poster } = validated.data;

    // Check if already in library
    const existing = await db.query.library.findFirst({
      where: and(
        eq(library.userId, user.userId),
        eq(library.contentId, contentId)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Already in library' },
        { status: 409 }
      );
    }

    // Add to library
    const id = nanoid();
    await db.insert(library).values({
      id,
      userId: user.userId,
      contentId,
      contentType,
      title,
      poster,
      addedAt: new Date(),
    });

    return NextResponse.json(
      { data: { id, contentId, contentType, title, poster } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to add to library:', error);
    return NextResponse.json(
      { error: 'Failed to add to library' },
      { status: 500 }
    );
  }
}
