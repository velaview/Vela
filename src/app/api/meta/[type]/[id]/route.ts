/**
 * GET /api/meta/[type]/[id]
 * 
 * Get metadata for a specific item from Stremio addons.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMeta } from '@/core/streaming';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;

    // Get current user - meta requires authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch meta from Stremio addons
    const meta = await getMeta(type, id);

    if (!meta) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: meta });

  } catch (error) {
    console.error('[MetaAPI] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get content details' },
      { status: 500 }
    );
  }
}
