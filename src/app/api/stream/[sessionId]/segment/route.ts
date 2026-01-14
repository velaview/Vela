/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEGMENT PROXY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * GET /api/stream/{sessionId}/segment?u=<encoded-url>
 *
 * Redirects to upstream HLS segments.
 * Uses 302 redirect for performance (segment URLs are short-lived anyway).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/core/streaming';

// Allowed domains for segment redirects (open redirect protection)
const ALLOWED_STREAM_DOMAINS = [
  'api.torbox.app',
  'stream.torbox.app',
  'debrid.torbox.app',
  'cdn.torbox.app',
  'torbox.app',
  'stremio.torbox.app',
];

/**
 * Validate URL against allowed stream domains (open redirect protection)
 */
function isAllowedStreamUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Only allow HTTPS
    if (url.protocol !== 'https:') {
      return false;
    }

    // Check against whitelist
    return ALLOWED_STREAM_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

interface RouteParams {
    params: Promise<{ sessionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { sessionId } = await params;
        const url = request.nextUrl.searchParams.get('u');

        if (!url) {
            return new NextResponse('Missing segment URL', { status: 400 });
        }

        // Validate session exists (async database lookup)
        const session = await getSession(sessionId);

        if (!session) {
            return new NextResponse('Session not found or expired', { status: 404 });
        }

        // Decode and validate URL (open redirect protection)
        const decodedUrl = decodeURIComponent(url);

        if (!isAllowedStreamUrl(decodedUrl)) {
            console.warn(`[Segment Proxy] Blocked redirect to non-whitelisted domain: ${decodedUrl}`);
            return new NextResponse('URL not allowed', { status: 403 });
        }

        return NextResponse.redirect(decodedUrl, 302);

    } catch (error) {
        console.error('[Segment Proxy] Error:', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}
