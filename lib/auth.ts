/**
 * Secure authentication utilities for admin panel
 * Uses HMAC-SHA256 signed tokens stored in cookies
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

// Configuration from environment variables - 不再使用不安全的默认值
const getAuthConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || (isProduction ? '' : 'admin');
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'dev_password_change_me');
  const AUTH_SECRET = process.env.AUTH_SECRET || (isProduction ? '' : 'dev_secret_key_not_for_production_use');
  
  // 生产环境强制检查
  if (isProduction && (!ADMIN_USERNAME || !ADMIN_PASSWORD || !AUTH_SECRET)) {
    throw new Error('ADMIN_USERNAME, ADMIN_PASSWORD, and AUTH_SECRET must be set in production');
  }
  
  if (isProduction && AUTH_SECRET.length < 32) {
    throw new Error('AUTH_SECRET must be at least 32 characters in production');
  }
  
  return { ADMIN_USERNAME, ADMIN_PASSWORD, AUTH_SECRET };
};

const TOKEN_NAME = 'admin_token';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Create HMAC-SHA256 signature for payload
 */
function createSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Secure token generation with HMAC-SHA256 signature
 * Token format: base64(payload).signature
 */
export function generateToken(username: string): string {
  const { AUTH_SECRET } = getAuthConfig();
  
  const payload = {
    username,
    exp: Date.now() + TOKEN_MAX_AGE * 1000,
    iat: Date.now(), // issued at
  };
  
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createSignature(payloadBase64, AUTH_SECRET);
  
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify token validity with timing-safe comparison
 */
export function verifyToken(token: string): { valid: boolean; username?: string } {
  try {
    const { AUTH_SECRET } = getAuthConfig();
    
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false };
    }
    
    const [payloadBase64, providedSignature] = parts;
    
    // Verify signature using timing-safe comparison
    const expectedSignature = createSignature(payloadBase64, AUTH_SECRET);
    
    const providedBuffer = Buffer.from(providedSignature, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    
    if (providedBuffer.length !== expectedBuffer.length) {
      return { valid: false };
    }
    
    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return { valid: false };
    }
    
    // Parse and validate payload
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    
    // Check expiration
    if (!payload.exp || payload.exp < Date.now()) {
      return { valid: false };
    }
    
    // Validate payload structure
    if (!payload.username || typeof payload.username !== 'string') {
      return { valid: false };
    }
    
    return { valid: true, username: payload.username };
  } catch {
    return { valid: false };
  }
}

/**
 * Validate login credentials with timing-safe comparison
 */
export function validateCredentials(username: string, password: string): boolean {
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = getAuthConfig();
  
  // Use timing-safe comparison to prevent timing attacks
  const usernameBuffer = Buffer.from(username);
  const expectedUsernameBuffer = Buffer.from(ADMIN_USERNAME);
  const passwordBuffer = Buffer.from(password);
  const expectedPasswordBuffer = Buffer.from(ADMIN_PASSWORD);
  
  // Ensure we always compare both to prevent timing leaks
  const usernameMatch = usernameBuffer.length === expectedUsernameBuffer.length &&
    timingSafeEqual(usernameBuffer, expectedUsernameBuffer);
  const passwordMatch = passwordBuffer.length === expectedPasswordBuffer.length &&
    timingSafeEqual(passwordBuffer, expectedPasswordBuffer);
  
  return usernameMatch && passwordMatch;
}

/**
 * Get token from request cookies
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(TOKEN_NAME)?.value || null;
}

/**
 * Check if request is authenticated
 */
export function isAuthenticated(request: NextRequest): boolean {
  const token = getTokenFromRequest(request);
  if (!token) return false;
  return verifyToken(token).valid;
}

/**
 * Create response with auth cookie
 */
export function setAuthCookie(response: NextResponse, token: string): NextResponse {
  // 使用 headers 直接设置 Set-Cookie，确保在 Vercel 上正常工作
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieValue = [
    `${TOKEN_NAME}=${token}`,
    `Path=/`,
    `Max-Age=${TOKEN_MAX_AGE}`,
    `HttpOnly`,
    `SameSite=Lax`, // 使用 Lax 而不是 Strict，以支持从登录页跳转
    isProduction ? 'Secure' : '',
  ].filter(Boolean).join('; ');
  
  response.headers.set('Set-Cookie', cookieValue);
  return response;
}

/**
 * Create response that clears auth cookie
 */
export function clearAuthCookie(response: NextResponse): NextResponse {
  // 使用 headers 直接清除 Cookie
  const cookieValue = [
    `${TOKEN_NAME}=`,
    `Path=/`,
    `Max-Age=0`,
    `HttpOnly`,
  ].join('; ');
  
  response.headers.set('Set-Cookie', cookieValue);
  return response;
}

export { TOKEN_NAME };
