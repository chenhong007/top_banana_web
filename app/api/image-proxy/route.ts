import { NextRequest, NextResponse } from 'next/server';
import { validateImageUrlForProxy, getSecurityHeaders } from '@/lib/security';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Image Proxy API
 * Fetches external images server-side to bypass CORS and hotlink protection
 * Security: Validates URLs against allowlist and blocks internal/private addresses
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('URL is required', { status: 400 });
  }

  // Security: Validate URL for SSRF and check against allowlist
  const urlValidation = validateImageUrlForProxy(imageUrl);
  if (!urlValidation.valid) {
    return new NextResponse(urlValidation.error || 'URL not allowed', { status: 403 });
  }

  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        // Mimic browser request
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        // Some CDNs check referer
        'Referer': url.origin + '/',
      },
    });

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Only allow image content types
    if (!contentType.startsWith('image/')) {
      return new NextResponse('Not an image', { status: 400 });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new NextResponse('Failed to fetch image', { status: 500 });
  }
}

