import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Image Proxy API
 * Fetches external images server-side to bypass CORS and hotlink protection
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('URL is required', { status: 400 });
  }

  // Validate URL
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  // Only allow http/https protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    return new NextResponse('Invalid protocol', { status: 400 });
  }

  // Allow list of domains (can be extended)
  const allowedDomains = [
    'cdn.nlark.com',
    'mmbiz.qpic.cn',
    'mmbiz.qlogo.cn',
    'pic1.zhimg.com',
    'pic2.zhimg.com',
    'pic3.zhimg.com',
    'pic4.zhimg.com',
    'i.imgur.com',
    'images.unsplash.com',
    'cdn.jsdelivr.net',
    'raw.githubusercontent.com',
    'avatars.githubusercontent.com',
    'opennana.com',
  ];

  // Check if domain is allowed or if it's a general image host
  const isAllowed = allowedDomains.some(domain => url.hostname.endsWith(domain)) ||
    url.hostname.includes('cdn') ||
    url.hostname.includes('image') ||
    url.hostname.includes('img') ||
    url.hostname.includes('pic');

  if (!isAllowed) {
    console.warn(`Image proxy: domain not in allowlist: ${url.hostname}`);
    // Still try to fetch - just log warning
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
      console.error(`Image proxy failed: ${response.status} for ${imageUrl}`);
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
    console.error('Image proxy error:', error);
    return new NextResponse('Failed to fetch image', { status: 500 });
  }
}

