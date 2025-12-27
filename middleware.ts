import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const TOKEN_NAME = 'admin_token';

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy - Allows inline scripts/styles for Next.js
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
  );
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}

// Admin access control configuration - 在模块级别读取一次
const SHOW_ADMIN_ENTRY = process.env.NEXT_PUBLIC_SHOW_ADMIN_ENTRY !== 'false';
const ADMIN_ALLOWED_DOMAINS = (process.env.NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS || '')
  .split(',')
  .map(d => d.trim().toLowerCase())
  .filter(Boolean);

// Routes that require authentication
const PROTECTED_ROUTES = ['/admin'];

// Routes that should redirect to admin if already logged in
const AUTH_ROUTES = ['/login'];

// Create next-intl middleware
const intlMiddleware = createMiddleware(routing);

/**
 * 使用 Web Crypto API 创建 HMAC-SHA256 签名（Edge Runtime 兼容）
 */
async function createSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  
  // 转换为 hex 字符串
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 安全的 Token 验证（Edge Runtime 兼容）
 */
async function verifyToken(token: string): Promise<boolean> {
  try {
    const AUTH_SECRET = process.env.AUTH_SECRET;
    
    if (!AUTH_SECRET || AUTH_SECRET.length < 32) {
      console.error('[Middleware] AUTH_SECRET not configured or too short');
      return false;
    }
    
    const parts = token.split('.');
    if (parts.length !== 2) {
      console.error('[Middleware] Token format invalid');
      return false;
    }
    
    const [payloadBase64, providedSignature] = parts;
    
    // 使用 Web Crypto API 验证签名
    const expectedSignature = await createSignature(payloadBase64, AUTH_SECRET);
    
    // 简单的字符串比较（在这个场景下足够安全）
    if (providedSignature !== expectedSignature) {
      console.error('[Middleware] Signature mismatch');
      return false;
    }
    
    // 解析 payload
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    
    // 检查过期
    if (!payload.exp || payload.exp < Date.now()) {
      console.error('[Middleware] Token expired');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Middleware] Token verification error:', error);
    return false;
  }
}

/**
 * Check if admin access is allowed for the current domain
 */
function isAdminAllowedForDomain(hostname: string): boolean {
  // If admin entry is globally disabled, deny access
  if (!SHOW_ADMIN_ENTRY) {
    return false;
  }
  
  // If no specific domains are configured, allow all
  if (ADMIN_ALLOWED_DOMAINS.length === 0) {
    return true;
  }
  
  const host = hostname.toLowerCase();
  
  // Check if domain is in allowed list
  return ADMIN_ALLOWED_DOMAINS.some(domain => 
    host === domain || 
    host.endsWith(`.${domain}`) ||
    // Allow all vercel.app subdomains if any vercel.app is in the list
    (domain.includes('vercel.app') && host.includes('vercel.app'))
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const token = request.cookies.get(TOKEN_NAME)?.value;

  // Skip i18n middleware for admin routes, API routes, and static files
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/login');
  const isApiPath = pathname.startsWith('/api');
  const isStaticPath = pathname.startsWith('/_next') || 
                       pathname.startsWith('/favicon') ||
                       pathname.includes('.');

  // Handle admin authentication
  if (isAdminPath) {
    const isAuthenticated = token ? await verifyToken(token) : false;
    
    const isProtectedRoute = PROTECTED_ROUTES.some(route => 
      pathname.startsWith(route) && !pathname.startsWith('/login')
    );
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

    // Check domain-level admin access control
    if ((isProtectedRoute || isAuthRoute) && !isAdminAllowedForDomain(hostname)) {
      return NextResponse.redirect(new URL('/zh', request.url));
    }

    // Redirect to login if accessing protected route without auth
    if (isProtectedRoute && !isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect to admin if accessing login page while already authenticated
    if (isAuthRoute && isAuthenticated) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }

  // Skip i18n for API and static paths
  if (isApiPath || isStaticPath) {
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }

  // Apply i18n middleware for frontend routes
  const response = intlMiddleware(request);
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes that don't need i18n
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
    // Include root path
    '/',
  ],
};
