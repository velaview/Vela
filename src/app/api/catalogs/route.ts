/**
 * GET /api/catalogs
 * 
 * Get all available catalogs from Stremio addons.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAvailableCatalogs } from '@/core/streaming';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', data: [] },
        { status: 401 }
      );
    }

    const catalogs = await getAvailableCatalogs();
    return NextResponse.json({ data: catalogs });

  } catch (error) {
    console.error('[CatalogsAPI] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get catalogs', data: [] },
      { status: 500 }
    );
  }
}
