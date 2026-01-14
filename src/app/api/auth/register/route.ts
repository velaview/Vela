import { NextRequest, NextResponse } from 'next/server';
import { db, users, preferences } from '@/lib/db';
import { hashPassword, registerSchema, createToken, setAuthCookie, checkRateLimit, getClientIp } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 attempts per 15 minutes
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(ip, 'auth');

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
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
    const validated = registerSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, displayName } = validated.data;

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with UUID
    const userId = crypto.randomUUID();
    const now = new Date();

    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      createdAt: now,
      updatedAt: now,
    });

    // Create default preferences
    await db.insert(preferences).values({
      userId,
      theme: 'dark',
      language: 'en',
      autoplayNext: true,
      autoplayPreviews: true,
      defaultQuality: 'auto',
      subtitleLang: 'en',
      maturityLevel: 'all',
    });

    // Create JWT token
    const token = await createToken({ userId, email: email.toLowerCase() });

    // Set auth cookie
    await setAuthCookie(token);

    // Return user data (without sensitive info)
    return NextResponse.json(
      {
        user: {
          id: userId,
          email: email.toLowerCase(),
          displayName,
        },
        message: 'Account created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
