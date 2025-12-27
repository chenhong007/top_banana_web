/**
 * Simple in-memory rate limiter
 *
 * Notes:
 * - Resets on server restart and does not coordinate across instances.
 * - For production / multi-region, prefer Redis / durable KV / edge rate limiting.
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number | null;
  windowMs: number;
}

// In-memory store for rate limiting
// Note: This resets on server restart. For production with multiple instances,
// consider using Redis or a database-backed solution.
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default login configuration (kept for backwards compatibility)
const DEFAULT_LOGIN_MAX_ATTEMPTS = 5;
const DEFAULT_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LOGIN_BLOCK_DURATION_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Cleanup every 5 minutes

/**
 * Clean up expired entries periodically
 */
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  // Only cleanup periodically to avoid performance issues
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }
  
  lastCleanup = now;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries that are outside the window and not blocked
    const isExpired = now - entry.firstAttempt > entry.windowMs;
    const isUnblocked = entry.blockedUntil && now > entry.blockedUntil;
    
    if ((isExpired && !entry.blockedUntil) || isUnblocked) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header for proxied requests, falls back to IP
 */
export function getClientIdentifier(request: Request): string {
  // Prefer explicit client IP headers set by common proxies/CDNs.
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const trueClientIp = request.headers.get('true-client-ip');
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  const raw =
    cfConnectingIp ||
    trueClientIp ||
    vercelForwardedFor ||
    (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ||
    realIp;

  if (raw && raw.length < 128) return raw;
  
  // Fallback - this may not work in all environments
  return 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
  message?: string;
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

/**
 * Generic, key-based in-memory rate limiter.
 * Call once per request to "consume" an attempt.
 */
export function consumeRateLimit(
  key: string,
  config: RateLimitConfig,
  message?: string
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Blocked
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      message: message || `请求过于频繁，请在 ${Math.ceil(retryAfterSeconds / 60)} 分钟后重试`,
    };
  }

  // Reset if no entry / window expired / previous block expired
  const shouldReset =
    !entry ||
    (entry.blockedUntil && now >= entry.blockedUntil) ||
    now - entry.firstAttempt > entry.windowMs;

  const next: RateLimitEntry = shouldReset
    ? { attempts: 0, firstAttempt: now, blockedUntil: null, windowMs: config.windowMs }
    : entry;

  // Consume one attempt
  next.attempts += 1;
  next.windowMs = config.windowMs;

  // Over limit -> block
  if (next.attempts > config.maxAttempts) {
    next.blockedUntil = now + config.blockDurationMs;
    rateLimitStore.set(key, next);

    const retryAfterSeconds = Math.ceil(config.blockDurationMs / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      message: message || `请求过于频繁，请在 ${Math.ceil(retryAfterSeconds / 60)} 分钟后重试`,
    };
  }

  rateLimitStore.set(key, next);

  return {
    allowed: true,
    remaining: Math.max(0, config.maxAttempts - next.attempts),
  };
}

/**
 * Check if a login attempt is allowed
 */
export function checkRateLimit(identifier: string): RateLimitResult {
  cleanupExpiredEntries();
  
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  // No previous attempts
  if (!entry) {
    return {
      allowed: true,
      remaining: DEFAULT_LOGIN_MAX_ATTEMPTS - 1,
    };
  }
  
  // Check if blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      message: `登录尝试次数过多，请在 ${Math.ceil(retryAfterSeconds / 60)} 分钟后重试`,
    };
  }
  
  // Reset if block expired
  if (entry.blockedUntil && now >= entry.blockedUntil) {
    rateLimitStore.delete(identifier);
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
    };
  }
  
  // Check if within window
  if (now - entry.firstAttempt > entry.windowMs) {
    // Window expired, reset
    rateLimitStore.delete(identifier);
    return {
      allowed: true,
      remaining: DEFAULT_LOGIN_MAX_ATTEMPTS - 1,
    };
  }
  
  // Within window, check attempts
  const remaining = DEFAULT_LOGIN_MAX_ATTEMPTS - entry.attempts;
  
  if (remaining <= 0) {
    // Block the user
    entry.blockedUntil = now + DEFAULT_LOGIN_BLOCK_DURATION_MS;
    rateLimitStore.set(identifier, entry);
    
    const retryAfterSeconds = Math.ceil(DEFAULT_LOGIN_BLOCK_DURATION_MS / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      message: `登录尝试次数过多，请在 ${Math.ceil(retryAfterSeconds / 60)} 分钟后重试`,
    };
  }
  
  return {
    allowed: true,
    remaining: remaining - 1,
  };
}

/**
 * Record a login attempt
 */
export function recordLoginAttempt(identifier: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  if (!entry) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
      blockedUntil: null,
      windowMs: DEFAULT_LOGIN_WINDOW_MS,
    });
    return;
  }
  
  // If window expired, reset
  if (now - entry.firstAttempt > entry.windowMs) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
      blockedUntil: null,
      windowMs: DEFAULT_LOGIN_WINDOW_MS,
    });
    return;
  }
  
  // Increment attempts
  entry.attempts++;
  rateLimitStore.set(identifier, entry);
}

/**
 * Clear rate limit for an identifier (e.g., after successful login)
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get rate limit status for monitoring
 */
export function getRateLimitStatus(): { activeEntries: number; blockedEntries: number } {
  const now = Date.now();
  let activeEntries = 0;
  let blockedEntries = 0;
  
  for (const entry of rateLimitStore.values()) {
    if (entry.blockedUntil && now < entry.blockedUntil) {
      blockedEntries++;
    } else {
      activeEntries++;
    }
  }
  
  return { activeEntries, blockedEntries };
}

