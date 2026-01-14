/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STREAM PROXY
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * GET /api/stream/{sessionId}/master.m3u8
 * 
 * Smart proxy:
 * - If upstream is HLS manifest → proxy and rewrite URLs
 * - If upstream is direct video → redirect to URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/core/streaming';

interface RouteParams {
    params: Promise<{ sessionId: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stream/{sessionId}/master.m3u8
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
    const startTime = Date.now();

    try {
        const { sessionId } = await params;
        console.log(`\n[StreamProxy] Request for session: ${sessionId}`);

        // Get session (async database lookup)
        const session = await getSession(sessionId);

        if (!session) {
            console.log(`[StreamProxy] ❌ Session not found: ${sessionId}`);
            return new NextResponse('Session not found or expired', { status: 404 });
        }

        console.log(`[StreamProxy] Session found:`);
        console.log(`  Content: ${session.contentId} (${session.type})`);
        console.log(`  Quality: ${session.stream.quality}`);
        console.log(`  HLS URL: ${session.stream.hlsUrl ? 'Yes' : 'No (direct)'}`);
        console.log(`  Upstream: ${session.upstreamUrl.substring(0, 80)}...`);

        // If we have a known HLS URL from TorBox Stream API, use it directly
        if (session.stream.hlsUrl) {
            console.log(`[StreamProxy] Using TorBox HLS stream (cross-browser compatible)`);
            return NextResponse.redirect(session.stream.hlsUrl, { status: 302 });
        }

        // HEAD request first to check content type (fast!)
        const headStart = Date.now();
        const headResponse = await fetch(session.upstreamUrl, {
            method: 'HEAD',
            headers: {
                'User-Agent': 'Vela/2.0',
            },
            redirect: 'follow',
        });
        const headTime = Date.now() - headStart;

        const contentType = headResponse.headers.get('content-type') || '';
        const contentLength = headResponse.headers.get('content-length') || '0';
        const finalUrl = headResponse.url; // After redirects

        console.log(`[StreamProxy] HEAD response in ${headTime}ms:`);
        console.log(`  Final URL: ${finalUrl.substring(0, 80)}...`);
        console.log(`  Content-Type: ${contentType}`);
        console.log(`  Content-Length: ${contentLength}`);

        // Check if it's an HLS manifest - must be explicitly a manifest type
        // Don't rely on size checks - missing Content-Length caused false positives
        const isHLS = contentType.includes('mpegurl') ||
            contentType.includes('m3u8') ||
            finalUrl.endsWith('.m3u8');

        if (!isHLS) {
            // Direct video file - redirect to TorBox/CDN
            const sizeGB = parseInt(contentLength) / 1024 / 1024 / 1024;
            console.log(`[StreamProxy] ✅ Direct video - redirecting (${sizeGB > 0 ? sizeGB.toFixed(2) + ' GB' : 'unknown size'})`);
            return NextResponse.redirect(finalUrl, { status: 302 });
        }

        // It's an HLS manifest - fetch and rewrite
        console.log(`[StreamProxy] HLS manifest detected - proxying...`);

        const manifestResponse = await fetch(finalUrl, {
            headers: {
                'User-Agent': 'Vela/2.0',
            },
        });

        if (!manifestResponse.ok) {
            console.error(`[StreamProxy] ❌ Manifest fetch failed: ${manifestResponse.status}`);
            return new NextResponse('Upstream error', { status: 502 });
        }

        const manifest = await manifestResponse.text();
        console.log(`[StreamProxy] Manifest: ${manifest.length} bytes`);

        // Rewrite URLs
        const rewritten = rewriteManifest(manifest, sessionId);

        const totalTime = Date.now() - startTime;
        console.log(`[StreamProxy] ✅ Complete in ${totalTime}ms\n`);

        return new NextResponse(rewritten, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Cache-Control': 'public, max-age=5',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`[StreamProxy] ❌ Error after ${totalTime}ms:`, error);
        return new NextResponse('Internal error', { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Manifest Rewriting
// ─────────────────────────────────────────────────────────────────────────────

function rewriteManifest(manifest: string, sessionId: string): string {
    const lines = manifest.split('\n');
    const rewritten: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            // Rewrite absolute URLs to go through our proxy
            const encoded = encodeURIComponent(trimmed);
            rewritten.push(`/api/stream/${sessionId}/segment?u=${encoded}`);
        } else if (trimmed.endsWith('.ts') || trimmed.endsWith('.m4s') || trimmed.endsWith('.m3u8')) {
            // Rewrite segment/playlist URLs  
            const encoded = encodeURIComponent(trimmed);
            rewritten.push(`/api/stream/${sessionId}/segment?u=${encoded}`);
        } else {
            // Keep other lines (tags, etc.) as-is
            rewritten.push(line);
        }
    }

    return rewritten.join('\n');
}

