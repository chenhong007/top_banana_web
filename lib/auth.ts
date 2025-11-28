/**
 * Simple authentication utilities for admin panel
 * Uses JWT-like token stored in cookies
 */

import { NextRequest, NextResponse } from 'next/server';

// Configuration from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const AUTH_SECRET = process.env.AUTH_SECRET || 'your-secret-key-change-in-production';
const TOKEN_NAME = 'admin_token';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Simple token generation (base64 encoded JSON with expiry)
 */
export function generateToken(username: string): string {
  const payload = {
    username,
    exp: Date.now() + TOKEN_MAX_AGE * 1000,
    secret: AUTH_SECRET,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Verify token validity
 */
export function verifyToken(token: string): { valid: boolean; username?: string } {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    
    if (payload.secret !== AUTH_SECRET) {
      return { valid: false };
    }
    
    if (payload.exp < Date.now()) {
      return { valid: false };
    }
    
    return { valid: true, username: payload.username };
  } catch {
    return { valid: false };
  }
}

/**
 * Validate login credentials
 */
export function validateCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
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
  response.cookies.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  });
  return response;
}

/**
 * Create response that clears auth cookie
 */
export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.delete(TOKEN_NAME);
  return response;
}

export { TOKEN_NAME };

