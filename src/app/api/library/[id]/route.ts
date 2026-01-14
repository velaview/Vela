import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, library } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────
// GET - Check if content is in library
// ─────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if this is a contentId (starts with tt for IMDB)
    const item = await db.query.library.findFirst({
      where: and(
        eq(library.userId, user.userId),
        eq(library.contentId, id)
      ),
    });

    return NextResponse.json({ 
      data: { 
        inLibrary: !!item,
        libraryId: item?.id || null 
      } 
    });
  } catch (error) {
    console.error('Failed to check library:', error);
    return NextResponse.json(
      { error: 'Failed to check library' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE - Remove from library (by library ID or content ID)
// ─────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // First check if this is a library ID or contentId
    const existingById = await db.query.library.findFirst({
      where: and(
        eq(library.id, id),
        eq(library.userId, user.userId)
      ),
    });

    if (existingById) {
      // Delete by library ID
      await db.delete(library).where(
        and(
          eq(library.id, id),
          eq(library.userId, user.userId)
        )
      );
    } else {
      // Try to delete by contentId
      await db.delete(library).where(
        and(
          eq(library.contentId, id),
          eq(library.userId, user.userId)
        )
      );
    }

    return NextResponse.json({ message: 'Removed from library' });
  } catch (error) {
    console.error('Failed to remove from library:', error);
    return NextResponse.json(
      { error: 'Failed to remove from library' },
      { status: 500 }
    );
  }
}
