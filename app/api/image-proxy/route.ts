/**
 * Image Proxy API
 * Proxies external images to bypass hotlink protection (防盗链)
 * Supports: cdn.nlark.com (语雀), mmbiz.qpic.cn (微信), etc.
 */

import { NextRequest, NextResponse } from 'next/server';

// Allowed image domains for security
const ALLOWED_DOMAINS = [
  'cdn.nlark.com',
  'mmbiz.qpic.cn',
  'pbs.twimg.com',
  'linux.do',
  'cdn.jsdelivr.net',
  // Add more trusted domains as needed
];

// Cache duration: 7 days
const CACHE_DURATION = 7 * 24 * 60 * 60;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('URL parameter is required', { status: 400 });
  }

  try {
    // Decode the URL
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // Validate URL format
    let url: URL;
    try {
      url = new URL(decodedUrl);
    } catch {
      return new NextResponse('Invalid URL format', { status: 400 });
    }

    // Security check: only allow specific domains
    const isAllowed = ALLOWED_DOMAINS.some(domain => url.hostname.includes(domain));
    if (!isAllowed) {
      console.warn(`Blocked image proxy request for domain: ${url.hostname}`);
      return new NextResponse('Domain not allowed', { status: 403 });
    }

    // Fetch the image from the original source
    const response = await fetch(decodedUrl, {
      headers: {
        // Set a browser-like User-Agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Some sites check Referer, so we set it to the origin domain
        'Referer': url.origin,
        // Accept common image formats
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      // Set a reasonable timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return new NextResponse(`Failed to fetch image: ${response.status}`, { 
        status: response.status 
      });
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();

    // Determine content type
    let contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Handle special cases for content type
    if (decodedUrl.endsWith('.webp')) {
      contentType = 'image/webp';
    } else if (decodedUrl.endsWith('.png')) {
      contentType = 'image/png';
    } else if (decodedUrl.endsWith('.gif')) {
      contentType = 'image/gif';
    } else if (decodedUrl.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    }

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${CACHE_DURATION}, immutable`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return new NextResponse('Image fetch timeout', { status: 504 });
    }
    
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

