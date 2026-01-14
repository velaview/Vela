import { NextRequest, NextResponse } from 'next/server';

// Allowed domains for subtitle fetching (SSRF protection)
const ALLOWED_SUBTITLE_DOMAINS = [
  'opensubtitles.org',
  'www.opensubtitles.org',
  'dl.opensubtitles.org',
  'vip.opensubtitles.org',
  'opensubtitles-v3.strem.io',
  'sub.wyzie.ru',
  'sub-proxy.wyzie.ru',
  'subs.wyzie.ru',
  'stremio-sub.wyzie.ru',
  'subscene.com',
  'www.subscene.com',
  'yifysubtitles.org',
  'www.yifysubtitles.org',
  'yts-subs.com',
  'www.yts-subs.com',
  'subdl.com',
  'dl.subdl.com',
  'addic7ed.com',
  'www.addic7ed.com',
];

/**
 * Validate URL against allowed domains (SSRF protection)
 */
function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Only allow HTTPS
    if (url.protocol !== 'https:') {
      return false;
    }

    // Check against whitelist
    return ALLOWED_SUBTITLE_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// Convert SRT to VTT format
function srtToVtt(srt: string): string {
  // Normalize line endings
  let content = srt
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  
  // Replace SRT timestamp format (00:00:00,000) with VTT format (00:00:00.000)
  content = content.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  
  // Split into blocks
  const blocks = content.split(/\n\n+/);
  const vttBlocks: string[] = [];
  
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 2) continue;
    
    // Find the timestamp line (contains -->)
    let timestampIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timestampIndex = i;
        break;
      }
    }
    
    if (timestampIndex === -1) continue;
    
    // Get timestamp and text lines
    const timestamp = lines[timestampIndex];
    const textLines = lines.slice(timestampIndex + 1);
    
    if (textLines.length === 0) continue;
    
    // Build VTT cue
    vttBlocks.push(`${timestamp}\n${textLines.join('\n')}`);
  }
  
  return `WEBVTT\n\n${vttBlocks.join('\n\n')}`;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // SSRF protection: validate URL against whitelist
  if (!isAllowedUrl(url)) {
    console.warn(`[SubtitleProxy] Blocked request to non-whitelisted domain: ${url}`);
    return new NextResponse('URL not allowed', { status: 403 });
  }

  try {
    // Fetch the subtitle file (URL is validated)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch subtitle', { status: response.status });
    }

    let content = await response.text();
    
    // Check if it's SRT format (doesn't start with WEBVTT)
    if (!content.trim().startsWith('WEBVTT')) {
      content = srtToVtt(content);
    }

    // Return as VTT with proper content type
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Subtitle proxy error:', error);
    return new NextResponse('Failed to fetch subtitle', { status: 500 });
  }
}
