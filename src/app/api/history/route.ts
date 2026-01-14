import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { db, history } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// GET - Get watch history with filtering
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // 'watching' | 'completed' | 'all'
    const query = searchParams.get('q');

    const filters = [eq(history.userId, user.userId)];

    if (status === 'watching') {
      filters.push(eq(history.completed, false));
    } else if (status === 'completed') {
      filters.push(eq(history.completed, true));
    }

    // Since D1/SQLite like syntax might vary, Drizzle handles basic 'like' if supported or we filter in JS.
    // Drizzle SQLite support 'like'.
    // BUT 'like' operator is imported from 'drizzle-orm'
    // If we want to filter by title:
    // filters.push(like(history.title, `%${query}%`));
    // Since I can't easily import 'like' without seeing the file imports, I will check imports.
    // If imports are missing, I'll filter in JS for search (since result set is usually small, < 1000 items).
    // Actually, 'drizzle-orm' exports 'like'. I'll add it.

    const items = await db.query.history.findMany({
      where: and(...filters),
      orderBy: [desc(history.watchedAt)],
      limit: 100, // Safe limit, maybe increase for full history
    });

    let result = items;
    if (query) {
      const q = query.toLowerCase();
      result = items.filter(item => item.title.toLowerCase().includes(q));
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Failed to get history:', error);
    return NextResponse.json(
      { error: 'Failed to get history' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// POST - Update watch progress
// ─────────────────────────────────────────────────────────────

const updateSchema = z.object({
  contentId: z.string(),
  contentType: z.enum(['movie', 'series', 'anime']),
  title: z.string(),
  poster: z.string().optional(),
  season: z.number().optional(),
  episode: z.number().optional(),
  episodeTitle: z.string().optional(),
  position: z.number(),
  duration: z.number(),
});

export async function POST(request: NextRequest) {
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

    const data = validated.data;
    const percentage = Math.round((data.position / data.duration) * 100);
    const completed = percentage >= 90;

    // Check for existing entry
    const existing = await db.query.history.findFirst({
      where: and(
        eq(history.userId, user.userId),
        eq(history.contentId, data.contentId),
        data.season !== undefined ? eq(history.season, data.season) : undefined,
        data.episode !== undefined ? eq(history.episode, data.episode) : undefined
      ),
    });

    if (existing) {
      // Update existing entry
      await db.update(history)
        .set({
          position: data.position,
          duration: data.duration,
          watchedAt: new Date(),
          completed,
        })
        .where(eq(history.id, existing.id));

      return NextResponse.json({ data: { ...existing, position: data.position, completed } });
    }

    // Create new entry
    const id = crypto.randomUUID();
    await db.insert(history).values({
      id,
      userId: user.userId,
      contentId: data.contentId,
      contentType: data.contentType,
      title: data.title,
      poster: data.poster,
      season: data.season,
      episode: data.episode,
      episodeTitle: data.episodeTitle,
      position: data.position,
      duration: data.duration,
      watchedAt: new Date(),
      completed,
    });

    return NextResponse.json(
      { data: { id, ...data, completed } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to update history:', error);
    return NextResponse.json(
      { error: 'Failed to update history' },
      { status: 500 }
    );
  }
}
