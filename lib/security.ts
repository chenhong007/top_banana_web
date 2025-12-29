/**
 * Security Utilities
 * Provides security-related functions for the application
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from './auth';

function isSafeMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

/**
 * Basic CSRF mitigation for cookie-authenticated admin APIs:
 * - For non-safe methods, if Origin is present, require same-origin.
 * - If Origin is missing but Referer is present, require same-origin.
 * - If neither is present (e.g., curl/server-to-server), allow.
 */
function isSameOriginMutation(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const expected = request.nextUrl.origin;

  if (origin) return origin === expected;

  if (referer) {
    try {
      const ref = new URL(referer);
      return ref.origin === expected;
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Private/internal IP ranges and metadata service addresses to block
 * Prevents SSRF attacks
 */
const BLOCKED_IP_PATTERNS = [
  // IPv4 Private Networks
  /^10\./,                           // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
  /^192\.168\./,                     // 192.168.0.0/16
  // IPv4 Loopback
  /^127\./,                          // 127.0.0.0/8
  // IPv4 Link-Local
  /^169\.254\./,                     // 169.254.0.0/16
  // Cloud Metadata Services
  /^169\.254\.169\.254$/,            // AWS/GCP metadata
  /^100\.100\.100\.200$/,            // Alibaba Cloud metadata
  // IPv6 Loopback and Link-Local (simplified patterns)
  /^::1$/,                           // IPv6 loopback
  /^fe80:/i,                         // IPv6 link-local
  /^fc00:/i,                         // IPv6 unique local
  /^fd00:/i,                         // IPv6 unique local
];

/**
 * Blocked hostnames for SSRF protection
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',
  'metadata.google',
  'kubernetes.default',
  'kubernetes.default.svc',
];

/**
 * Validate URL for SSRF protection
 * @param urlString - The URL to validate
 * @returns Object with validation result and error message
 */
export function validateUrlForSSRF(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP/HTTPS protocols are allowed' };
    }
    
    const hostname = url.hostname.toLowerCase();
    
    // Check blocked hostnames
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return { valid: false, error: 'Access to localhost is not allowed' };
    }
    
    // Check IP patterns
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'Access to private/internal networks is not allowed' };
      }
    }
    
    // Block internal cloud metadata endpoints
    if (hostname.includes('metadata') || hostname.includes('internal')) {
      return { valid: false, error: 'Access to metadata services is not allowed' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Allowed domains for image proxy
 * These are trusted CDN and image hosting services
 */
const ALLOWED_IMAGE_DOMAINS = [
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
  'youmind.com',
  'cms-assets.youmind.com',
];

/**
 * Validate image URL for proxy
 * @param urlString - The URL to validate
 * @returns Object with validation result and error message
 */
export function validateImageUrlForProxy(urlString: string): { valid: boolean; error?: string } {
  // First run SSRF validation
  const ssrfCheck = validateUrlForSSRF(urlString);
  if (!ssrfCheck.valid) {
    return ssrfCheck;
  }
  
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Check if domain is in allowed list
    const isAllowed = ALLOWED_IMAGE_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    
    if (!isAllowed) {
      return { valid: false, error: `Domain ${hostname} is not in the allowed list` };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Check if request is authenticated for admin operations
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Please login first' },
      { status: 401 }
    );
  }

  // CSRF mitigation for state-changing requests (production only).
  if (process.env.NODE_ENV === 'production' && !isSafeMethod(request.method)) {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }
  }

  return null;
}

/**
 * Verify import secret for batch operations
 * Checks Authorization header or body secret field
 */
export function verifyImportSecret(
  request: NextRequest,
  body?: Record<string, unknown>
): { success: boolean; error?: string } {
  const importSecret = process.env.IMPORT_SECRET;
  
  if (!importSecret) {
    return { success: false, error: 'Server IMPORT_SECRET not configured' };
  }
  
  // Get token from header or body
  let token = request.headers.get('Authorization')?.replace('Bearer ', '') || 
              request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token && body?.secret && typeof body.secret === 'string') {
    token = body.secret;
  }

  if (!token) {
    // Avoid query-string secrets (leaks via logs/referrers); require header or body.
    return { success: false, error: 'Missing Authorization header or secret field' };
  }
  
  if (token !== importSecret) {
    return { success: false, error: 'Invalid token' };
  }

  return { success: true };
}

/**
 * Create standardized security headers
 */
export function getSecurityHeaders(): Record<string, string> {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    // Additional hardening headers
    ...(isProduction ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = getSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Sanitize error message for production
 * Removes sensitive details from error messages
 */
export function sanitizeErrorMessage(error: unknown, includeDetails = false): string {
  if (process.env.NODE_ENV !== 'production' && includeDetails) {
    return error instanceof Error ? error.message : String(error);
  }
  return 'An error occurred. Please try again later.';
}

/**
 * Rate limiter configuration type
 */
export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,      // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000,           // 1 minute
    blockDurationMs: 5 * 60 * 1000,  // 5 minutes
  },
};
