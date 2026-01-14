import { NextResponse } from 'next/server';
import { db, users, preferences } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // Get current user from JWT
    const tokenPayload = await getCurrentUser();

    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, tokenPayload.userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has TorBox key configured
    const userPrefs = await db.query.preferences.findFirst({
      where: eq(preferences.userId, user.id),
    });

    // Return user data (without sensitive info)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        nickname: user.nickname,
        avatar: user.avatar,
        hasTorboxKey: !!userPrefs?.torboxKeyEncrypted,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
