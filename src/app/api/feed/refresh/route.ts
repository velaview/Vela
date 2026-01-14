import { NextRequest, NextResponse } from 'next/server';
import { db, userRowTemplates } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.userId;

        // Clear existing templates for the user
        await db.delete(userRowTemplates).where(eq(userRowTemplates.userId, userId));


        return NextResponse.json({
            success: true,
            message: 'Feed templates cleared. Refresh the page to regenerate.'
        });
    } catch (error) {
        console.error('[FeedRefresh] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
