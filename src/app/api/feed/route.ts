/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FEED API
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * GET /api/feed
 * 
 * Returns catalog rows for homepage.
 * Uses Stremio addons directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCatalog } from '@/core/streaming';

// Default catalog rows to display
const DEFAULT_ROWS = [
  { type: 'movie', id: 'top', title: 'Popular Movies' },
  { type: 'series', id: 'top', title: 'Popular Series' },
  { type: 'movie', id: 'imdbRating', title: 'Top Rated Movies' },
  { type: 'series', id: 'imdbRating', title: 'Top Rated Series' },
  { type: 'movie', id: 'year', title: 'New Releases' },
];

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const cursor = parseInt(searchParams.get('cursor') || '0');

    // Filter rows by type
    let rows = DEFAULT_ROWS;
    if (type !== 'all') {
      rows = rows.filter(r => r.type === type || type === 'anime' && r.type === 'series');
    }

    // Paginate
    const pageSize = 4;
    const pageRows = rows.slice(cursor, cursor + pageSize);

    // Fetch content for each row
    const items = await Promise.all(
      pageRows.map(async (row) => {
        const content = await getCatalog(row.type, row.id);
        return {
          id: `${row.type}-${row.id}`,
          title: row.title,
          items: content.slice(0, 20),
          contentType: row.type,
        };
      })
    );

    // Filter empty rows
    const validItems = items.filter(row => row.items.length > 0);

    return NextResponse.json({
      mode: 'catalog-v2',
      items: validItems,
      nextCursor: cursor + pageSize,
      hasMore: cursor + pageSize < rows.length,
      context: {
        generatedAt: new Date().toISOString(),
        type,
      },
    });

  } catch (error) {
    console.error('[FeedAPI] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
