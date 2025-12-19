/**
 * Simple in-memory rate limiter for login attempts
 * Prevents brute force attacks by limiting login attempts per IP
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

// In-memory store for rate limiting
// Note: This resets on server restart. For production with multiple instances,
// consider using Redis or a database-backed solution.
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const MAX_ATTEMPTS = 5; // Maximum login attempts
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes block after max attempts
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
    const isExpired = now - entry.firstAttempt > WINDOW_MS;
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
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwardedFor) {
    // Take the first IP in case of multiple proxies
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback - this may not work in all environments
  return 'unknown';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
  message?: string;
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
      remaining: MAX_ATTEMPTS - 1,
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
  if (now - entry.firstAttempt > WINDOW_MS) {
    // Window expired, reset
    rateLimitStore.delete(identifier);
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
    };
  }
  
  // Within window, check attempts
  const remaining = MAX_ATTEMPTS - entry.attempts;
  
  if (remaining <= 0) {
    // Block the user
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    rateLimitStore.set(identifier, entry);
    
    const retryAfterSeconds = Math.ceil(BLOCK_DURATION_MS / 1000);
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
    });
    return;
  }
  
  // If window expired, reset
  if (now - entry.firstAttempt > WINDOW_MS) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
      blockedUntil: null,
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

