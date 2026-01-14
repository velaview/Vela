import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { db, users } from '@/lib/db';

// ─────────────────────────────────────────────────────────────
// PATCH - Update user profile
// ─────────────────────────────────────────────────────────────

const updateSchema = z.object({
    nickname: z.string().max(20).nullable().optional(),
    displayName: z.string().min(1).max(50).optional(),
    avatar: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
    try {
        const tokenPayload = await getCurrentUser();
        if (!tokenPayload) {
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

        const updates: Record<string, unknown> = {};

        if (validated.data.nickname !== undefined) {
            updates.nickname = validated.data.nickname;
        }

        if (validated.data.displayName !== undefined) {
            updates.displayName = validated.data.displayName;
        }

        if (validated.data.avatar !== undefined) {
            updates.avatar = validated.data.avatar;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ message: 'No updates provided' });
        }

        updates.updatedAt = new Date();

        await db
            .update(users)
            .set(updates)
            .where(eq(users.id, tokenPayload.userId));

        return NextResponse.json({ message: 'Profile updated' });
    } catch (error) {
        console.error('Failed to update profile:', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}
