/**
 * GET /api/catalog/[type]/[id]
 * 
 * Fetch catalog items from Stremio addons.
 * Supports: ?genre=Action&skip=0&search=query
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCatalog, getAvailableCatalogs } from '@/core/streaming';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;
    const { searchParams } = new URL(request.url);

    // Get current user - catalog requires authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', data: [] },
        { status: 401 }
      );
    }

    // Build extra parameters
    const extra: Record<string, string> = {};

    const genre = searchParams.get('genre');
    if (genre) extra.genre = genre;

    const skip = searchParams.get('skip');
    if (skip) extra.skip = skip;

    const search = searchParams.get('search');
    if (search) extra.search = search;

    // Fetch catalog
    const metas = await getCatalog(type, id, Object.keys(extra).length > 0 ? extra : undefined);

    // Get matching catalog for genres
    const catalogs = await getAvailableCatalogs();
    const matchingCatalog = catalogs.find(c => c.type === type && c.id === id);

    return NextResponse.json({
      data: metas,
      genres: matchingCatalog?.genres || [],
    });

  } catch (error) {
    console.error('[CatalogAPI] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get catalog', data: [] },
      { status: 500 }
    );
  }
}
