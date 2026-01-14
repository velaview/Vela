import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, history } from '@/lib/db';
import { eq, and, desc, gte } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get items from last 30 days that are not completed
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const items = await db.query.history.findMany({
      where: and(
        eq(history.userId, user.userId),
        eq(history.completed, false),
        gte(history.watchedAt, thirtyDaysAgo)
      ),
      orderBy: [desc(history.watchedAt)],
      limit: 20,
    });

    // Filter: watched at least 2 minutes, not at the very end
    const filtered = items.filter((item) => {
      const percentage = Math.round((item.position / item.duration) * 100);
      return item.position >= 120 && percentage < 95;
    });

    return NextResponse.json({ data: filtered });
  } catch (error) {
    console.error('Failed to get continue watching:', error);
    return NextResponse.json(
      { error: 'Failed to get continue watching' },
      { status: 500 }
    );
  }
}
