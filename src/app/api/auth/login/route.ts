import { NextRequest, NextResponse } from 'next/server';
import { db, users, preferences } from '@/lib/db';
import { verifyPassword, loginSchema, createToken, setAuthCookie, checkRateLimit, getClientIp } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 attempts per 15 minutes
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, 'auth');

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfter),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate input
    const validated = loginSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = validated.data;

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await createToken({ userId: user.id, email: user.email });

    // Set auth cookie
    await setAuthCookie(token);

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
        avatar: user.avatar,
        hasTorboxKey: !!userPrefs?.torboxKeyEncrypted,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
