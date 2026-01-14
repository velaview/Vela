import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, searchHistory } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const history = await db.query.searchHistory.findMany({
            where: eq(searchHistory.userId, user.userId),
            orderBy: [desc(searchHistory.createdAt)],
            limit: 10,
        });

        // Deduplicate queries
        const uniqueQueries = Array.from(new Set(history.map(h => h.query)))
            .map(q => history.find(h => h.query === q))
            .filter(Boolean);

        return NextResponse.json({ data: uniqueQueries });
    } catch (error) {
        console.error('Failed to get search history:', error);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
