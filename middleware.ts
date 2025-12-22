import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOKEN_NAME = 'admin_token';

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
  
  // 异步验证 Token
  const isAuthenticated = token ? await verifyToken(token) : false;

  // Check if accessing protected routes
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route) && !pathname.startsWith('/login')
  );

  // Check if accessing auth routes (login page)
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

  // Check domain-level admin access control
  if ((isProtectedRoute || isAuthRoute) && !isAdminAllowedForDomain(hostname)) {
    // Redirect to home page if admin access is not allowed for this domain
    return NextResponse.redirect(new URL('/', request.url));
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match admin routes
    '/admin/:path*',
    '/login',
    // Skip static files and API routes
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
