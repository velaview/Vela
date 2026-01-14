import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';

// ─────────────────────────────────────────────────────────────
// JWT Configuration
// ─────────────────────────────────────────────────────────────

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  // Fail loudly in production
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is required in production!');
    }
    console.warn('⚠️  [Security] Using dev-only JWT secret. Set JWT_SECRET in production!');
    return new TextEncoder().encode('dev-only-32-character-secret-key');
  }

  // Validate minimum length for security
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters for security.');
  }

  return new TextEncoder().encode(secret);
}

const JWT_SECRET = getJwtSecret();

const JWT_ISSUER = 'vela';
const JWT_AUDIENCE = 'vela-users';
const JWT_EXPIRY = '7d';

export const COOKIE_NAME = 'vela-token';

// ─────────────────────────────────────────────────────────────
// Token Payload Interface
// ─────────────────────────────────────────────────────────────

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
}

// ─────────────────────────────────────────────────────────────
// Create JWT Token
// ─────────────────────────────────────────────────────────────

export async function createToken(payload: { userId: string; email: string }): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

// ─────────────────────────────────────────────────────────────
// Verify JWT Token
// ─────────────────────────────────────────────────────────────

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload as TokenPayload;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Cookie Helpers
// ─────────────────────────────────────────────────────────────

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ─────────────────────────────────────────────────────────────
// Get Current User from Cookie
// ─────────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = await getAuthCookie();
  if (!token) return null;
  return verifyToken(token);
}
