import { NextRequest, NextResponse } from 'next/server';
import { validateImageUrlForProxy, applySecurityHeaders } from '@/lib/security';
import { consumeRateLimit, getClientIdentifier } from '@/lib/rate-limiter';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const FETCH_TIMEOUT_MS = 8000;

function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const secFetchSite = request.headers.get('sec-fetch-site'); // same-origin | same-site | cross-site | none

  // If the browser explicitly marks it as cross-site, deny.
  if (secFetchSite === 'cross-site') return false;

  // If Origin is present, enforce same-origin.
  if (origin) {
    return origin === request.nextUrl.origin;
  }

  // Non-browser / same-origin navigations may omit Origin.
  return true;
}

async function readResponseUpTo(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    return new Uint8Array(await response.arrayBuffer());
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch {}
      throw new Error('IMAGE_TOO_LARGE');
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * Image Proxy API
 * Fetches external images server-side to bypass CORS and hotlink protection
 * Security: Validates URLs against allowlist and blocks internal/private addresses
 */
export async function GET(request: NextRequest) {
  // Anti-abuse: only allow same-origin usage (prevents other sites hotlinking your proxy)
  if (!isSameOriginRequest(request)) {
    return applySecurityHeaders(
      new NextResponse('Forbidden', { status: 403 })
    );
  }

  // Anti-abuse: rate limit by IP
  const clientId = getClientIdentifier(request);
  const rl = consumeRateLimit(`image-proxy:${clientId}`, {
    maxAttempts: 60,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  });

  if (!rl.allowed) {
    return applySecurityHeaders(
      NextResponse.json(
        { success: false, error: rl.message || '请求过于频繁，请稍后重试', retryAfter: rl.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds || 60) } }
      )
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return applySecurityHeaders(new NextResponse('URL is required', { status: 400 }));
  }

  // Security: Validate URL for SSRF and check against allowlist
  const urlValidation = validateImageUrlForProxy(imageUrl);
  if (!urlValidation.valid) {
    return applySecurityHeaders(new NextResponse(urlValidation.error || 'URL not allowed', { status: 403 }));
  }

  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return applySecurityHeaders(new NextResponse('Invalid URL', { status: 400 }));
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        // Mimic browser request
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        // Some CDNs check referer
        'Referer': url.origin + '/',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return applySecurityHeaders(new NextResponse('Failed to fetch image', { status: response.status }));
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Only allow image content types
    if (!contentType.startsWith('image/')) {
      return applySecurityHeaders(new NextResponse('Not an image', { status: 400 }));
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const len = Number(contentLength);
      if (Number.isFinite(len) && len > MAX_IMAGE_BYTES) {
        return applySecurityHeaders(new NextResponse('Image too large', { status: 413 }));
      }
    }

    let imageBuffer: Uint8Array;
    try {
      imageBuffer = await readResponseUpTo(response, MAX_IMAGE_BYTES);
    } catch (e) {
      if (e instanceof Error && e.message === 'IMAGE_TOO_LARGE') {
        return applySecurityHeaders(new NextResponse('Image too large', { status: 413 }));
      }
      throw e;
    }

    // Some TS libs type Uint8Array as Uint8Array<ArrayBufferLike>, which can break BodyInit/BlobPart checks.
    // Copy into an ArrayBuffer-backed Uint8Array to keep types (and behavior) consistent.
    const bytes = new Uint8Array(imageBuffer);

    const proxied = new NextResponse(bytes, {
      headers: {
        'Content-Type': contentType,
        // 7天缓存，30天 stale-while-revalidate 支持后台更新
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=2592000',
      },
    });
    return applySecurityHeaders(proxied);
  } catch (error) {
    // Abort errors, DNS errors, timeouts, etc.
    const message = error instanceof Error && error.name === 'AbortError' ? 'Fetch timeout' : 'Failed to fetch image';
    return applySecurityHeaders(new NextResponse(message, { status: 500 }));
  }
}

