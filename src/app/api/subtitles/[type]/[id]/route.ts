/**
 * GET /api/subtitles/[type]/[id]
 * 
 * Get subtitles from OpenSubtitles Stremio addon.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSubtitles } from '@/core/streaming/providers/opensubtitles';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id } = await params;

    // Parse season/episode from query params for series
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season') ? parseInt(searchParams.get('season')!) : undefined;
    const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!) : undefined;

    const subtitles = await getSubtitles(
      id,
      type as 'movie' | 'series' | 'anime',
      season,
      episode
    );

    return NextResponse.json({ data: subtitles });

  } catch (error) {
    console.error('[SubtitlesAPI] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get subtitles' },
      { status: 500 }
    );
  }
}
