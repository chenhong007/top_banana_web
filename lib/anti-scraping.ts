/**
 * Anti-Scraping Utilities
 * Provides protection against bots, crawlers, and bulk data extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { consumeRateLimit, getClientIdentifier } from './rate-limiter';

// ============================================
// Bot Detection
// ============================================

/**
 * Known bot user agents (case-insensitive patterns)
 */
const BOT_USER_AGENTS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /python-urllib/i,
  /axios/i,
  /node-fetch/i,
  /go-http-client/i,
  /java\//i,
  /httpie/i,
  /postman/i,
  /insomnia/i,
  /scrapy/i,
  /phantomjs/i,
  /headlesschrome/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /webdriver/i,
  /httrack/i,
  /offline browser/i,
  /libwww/i,
  /lwp-/i,
  /mechanize/i,
  /aiohttp/i,
  /httpx/i,
];

/**
 * Good bots that should be allowed (search engines)
 */
const ALLOWED_BOTS = [
  /googlebot/i,
  /bingbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /duckduckbot/i,
  /slurp/i, // Yahoo
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
];

/**
 * Check if user agent indicates a bot
 */
export function detectBot(userAgent: string | null): {
  isBot: boolean;
  isAllowedBot: boolean;
  botType?: string;
} {
  if (!userAgent) {
    return { isBot: true, isAllowedBot: false, botType: 'empty-ua' };
  }

  // Check for allowed bots first (search engines)
  for (const pattern of ALLOWED_BOTS) {
    if (pattern.test(userAgent)) {
      const match = userAgent.match(pattern);
      return {
        isBot: true,
        isAllowedBot: true,
        botType: match ? match[0].toLowerCase() : 'allowed-bot',
      };
    }
  }

  // Check for suspicious bots
  for (const pattern of BOT_USER_AGENTS) {
    if (pattern.test(userAgent)) {
      const match = userAgent.match(pattern);
      return {
        isBot: true,
        isAllowedBot: false,
        botType: match ? match[0].toLowerCase() : 'suspicious-bot',
      };
    }
  }

  return { isBot: false, isAllowedBot: false };
}

// ============================================
// Request Fingerprinting
// ============================================

/**
 * Suspicious request patterns
 */
export function detectSuspiciousRequest(request: NextRequest): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const headers = request.headers;

  // 1. Missing common browser headers
  if (!headers.get('accept-language')) {
    reasons.push('missing-accept-language');
  }

  if (!headers.get('accept-encoding')) {
    reasons.push('missing-accept-encoding');
  }

  // 2. Suspicious Accept header (not typical browser request)
  const accept = headers.get('accept');
  if (accept === '*/*' || accept === 'application/json') {
    // API clients typically send these, browsers send more specific accepts
    reasons.push('api-client-accept');
  }

  // 3. Missing or suspicious Sec-Fetch headers (modern browsers send these)
  const secFetchMode = headers.get('sec-fetch-mode');
  const secFetchSite = headers.get('sec-fetch-site');
  const secFetchDest = headers.get('sec-fetch-dest');

  if (!secFetchMode && !secFetchSite && !secFetchDest) {
    // Modern browsers always send these
    reasons.push('missing-sec-fetch');
  }

  // 4. Cross-site fetch for API calls
  if (secFetchSite === 'cross-site') {
    reasons.push('cross-site-request');
  }

  // 5. No referrer for internal navigation
  if (!headers.get('referer') && secFetchMode === 'navigate') {
    reasons.push('no-referer-on-navigate');
  }

  return {
    suspicious: reasons.length >= 2, // Consider suspicious if 2+ indicators
    reasons,
  };
}

// ============================================
// Rate Limiting Configurations
// ============================================

export interface ApiRateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

/**
 * Rate limit configurations for different API endpoints
 */
export const API_RATE_LIMITS: Record<string, ApiRateLimitConfig> = {
  // Public data APIs - strict limits to prevent bulk extraction
  prompts: {
    maxAttempts: 30, // 30 requests per minute
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000, // 5 min block
  },
  
  // Filter/metadata APIs - slightly more lenient
  tags: {
    maxAttempts: 60,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },
  
  categories: {
    maxAttempts: 60,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },
  
  modelTags: {
    maxAttempts: 60,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },

  // Image proxy - prevent image bulk download
  imageProxy: {
    maxAttempts: 60,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },

  // Global API limit per IP
  global: {
    maxAttempts: 200, // 200 total API calls per minute
    windowMs: 60 * 1000,
    blockDurationMs: 10 * 60 * 1000, // 10 min block
  },
};

// ============================================
// API Protection Middleware
// ============================================

export interface ProtectionResult {
  allowed: boolean;
  response?: NextResponse;
  clientId: string;
}

/**
 * Apply anti-scraping protection to an API request
 */
export function applyApiProtection(
  request: NextRequest,
  endpoint: keyof typeof API_RATE_LIMITS
): ProtectionResult {
  const clientId = getClientIdentifier(request);
  const userAgent = request.headers.get('user-agent');

  // 1. Bot detection
  const botCheck = detectBot(userAgent);
  if (botCheck.isBot && !botCheck.isAllowedBot) {
    console.warn(`[Anti-Scraping] Blocked bot: ${botCheck.botType} from ${clientId}`);
    return {
      allowed: false,
      clientId,
      response: NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      ),
    };
  }

  // 2. Suspicious request detection (warn but don't block)
  const suspiciousCheck = detectSuspiciousRequest(request);
  if (suspiciousCheck.suspicious) {
    console.warn(
      `[Anti-Scraping] Suspicious request from ${clientId}: ${suspiciousCheck.reasons.join(', ')}`
    );
    // Could implement stricter rate limiting for suspicious requests
  }

  // 3. Global rate limit
  const globalLimit = consumeRateLimit(
    `api:global:${clientId}`,
    API_RATE_LIMITS.global,
    '请求过于频繁，请稍后重试'
  );

  if (!globalLimit.allowed) {
    return {
      allowed: false,
      clientId,
      response: NextResponse.json(
        {
          success: false,
          error: globalLimit.message,
          retryAfter: globalLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(globalLimit.retryAfterSeconds || 60),
            'X-RateLimit-Remaining': '0',
          },
        }
      ),
    };
  }

  // 4. Endpoint-specific rate limit
  const endpointConfig = API_RATE_LIMITS[endpoint];
  if (endpointConfig) {
    const endpointLimit = consumeRateLimit(
      `api:${endpoint}:${clientId}`,
      endpointConfig,
      '请求过于频繁，请稍后重试'
    );

    if (!endpointLimit.allowed) {
      return {
        allowed: false,
        clientId,
        response: NextResponse.json(
          {
            success: false,
            error: endpointLimit.message,
            retryAfter: endpointLimit.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(endpointLimit.retryAfterSeconds || 60),
              'X-RateLimit-Remaining': '0',
            },
          }
        ),
      };
    }
  }

  return { allowed: true, clientId };
}

// ============================================
// Response Protection
// ============================================

/**
 * Add anti-scraping headers to response
 */
export function addProtectionHeaders(response: NextResponse): NextResponse {
  // Prevent caching of API responses in shared caches
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  
  // Prevent embedding in iframes
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  return response;
}

// ============================================
// Data Obfuscation (Optional)
// ============================================

/**
 * Add delay to responses for suspicious requests
 * This slows down scrapers without affecting normal users much
 */
export async function throttleSuspiciousRequest(
  request: NextRequest,
  baseDelayMs = 0
): Promise<void> {
  const suspiciousCheck = detectSuspiciousRequest(request);
  
  if (suspiciousCheck.suspicious) {
    // Add 500-2000ms delay for suspicious requests
    const delay = baseDelayMs + Math.random() * 1500 + 500;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

// ============================================
// Honeypot Fields
// ============================================

/**
 * Generate honeypot field names (for forms)
 * Bots often fill all fields, humans leave hidden fields empty
 */
export function getHoneypotFieldNames(): string[] {
  return ['website', 'url', 'phone_number', 'fax', 'company_website'];
}

/**
 * Check if honeypot fields were filled (indicates bot)
 */
export function checkHoneypotFields(
  body: Record<string, unknown>,
  fieldNames = getHoneypotFieldNames()
): boolean {
  for (const field of fieldNames) {
    if (body[field] && String(body[field]).trim().length > 0) {
      return true; // Bot detected
    }
  }
  return false;
}

// ============================================
// Request Signing (Client-Side Token)
// ============================================

/**
 * Generate a simple request token for client-side use
 * This adds a barrier for simple scrapers
 */
export function generateRequestToken(timestamp: number, secret: string): string {
  // Simple HMAC-like token (in production, use crypto.subtle)
  const data = `${timestamp}:${secret}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Validate request token
 */
export function validateRequestToken(
  token: string,
  timestamp: number,
  secret: string,
  maxAgeMs = 5 * 60 * 1000 // 5 minutes
): boolean {
  const now = Date.now();
  
  // Check timestamp is not too old or in the future
  if (timestamp < now - maxAgeMs || timestamp > now + 60000) {
    return false;
  }
  
  const expectedToken = generateRequestToken(timestamp, secret);
  return token === expectedToken;
}
