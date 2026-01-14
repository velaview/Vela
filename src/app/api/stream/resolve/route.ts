/**
 * POST /api/stream/resolve
 * 
 * Resolve a stream alternative to HLS URL.
 * Used for background pre-resolution while video is playing.
 */

import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache for resolved URLs
const resolvedCache = new Map<string, string>();

export async function POST(request: NextRequest) {
    try {
        const { hash, magnet } = await request.json();

        if (!hash && !magnet) {
            return NextResponse.json({ error: 'hash or magnet required' }, { status: 400 });
        }

        // Check cache first
        const cacheKey = hash || magnet;
        if (resolvedCache.has(cacheKey)) {
            return NextResponse.json({
                hlsUrl: resolvedCache.get(cacheKey),
                cached: true
            });
        }

        // Get TorBox API key
        const apiKey = process.env.TORBOX_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'TorBox API key not configured' }, { status: 500 });
        }

        // Add torrent to library
        const addUrl = 'https://api.torbox.app/v1/api/torrents/createtorrent';
        const addResponse = await fetch(addUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                magnet: magnet || `magnet:?xt=urn:btih:${hash}`,
            }),
        });

        if (!addResponse.ok) {
            console.error('[Resolve] Failed to add torrent:', addResponse.status);
            return NextResponse.json({ error: 'Failed to add torrent' }, { status: 500 });
        }

        const addData = await addResponse.json();
        const torrentId = addData.data?.torrent_id;
        const fileId = addData.data?.files?.[0]?.id || 0;

        if (!torrentId) {
            return NextResponse.json({ error: 'No torrent ID returned' }, { status: 500 });
        }

        // Wait for torrent to be ready
        await new Promise(r => setTimeout(r, 1500));

        // Create HLS stream
        const hlsUrl = `https://api.torbox.app/v1/api/torrents/createstream?token=${apiKey}&torrent_id=${torrentId}&file_id=${fileId}`;
        const hlsResponse = await fetch(hlsUrl);

        if (!hlsResponse.ok) {
            console.error('[Resolve] Failed to create HLS:', hlsResponse.status);
            return NextResponse.json({ error: 'Failed to create HLS' }, { status: 500 });
        }

        const hlsData = await hlsResponse.json();
        const streamUrl = hlsData.data?.url;

        if (!streamUrl) {
            return NextResponse.json({ error: 'No HLS URL returned' }, { status: 500 });
        }

        // Cache the result
        resolvedCache.set(cacheKey, streamUrl);

        return NextResponse.json({ hlsUrl: streamUrl, cached: false });

    } catch (error) {
        console.error('[Resolve] Error:', error);
        return NextResponse.json(
            { error: 'Failed to resolve stream' },
            { status: 500 }
        );
    }
}
