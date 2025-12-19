import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_NAME = 'admin_token';

// 获取安全配置 - 不再使用不安全的默认值
const getAuthSecret = (): string => {
  const isProduction = process.env.NODE_ENV === 'production';
  const AUTH_SECRET = process.env.AUTH_SECRET || (isProduction ? '' : 'dev_secret_key_not_for_production_use');
  
  if (isProduction && (!AUTH_SECRET || AUTH_SECRET.length < 32)) {
    console.error('❌ AUTH_SECRET must be at least 32 characters in production');
    return '';
  }
  
  return AUTH_SECRET;
};

// Admin access control configuration
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
 * Create HMAC-SHA256 signature for payload
 */
function createSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Secure token verification with HMAC-SHA256 signature
 */
function verifyToken(token: string): boolean {
  try {
    const AUTH_SECRET = getAuthSecret();
    if (!AUTH_SECRET) {
      return false;
    }
    
    const parts = token.split('.');
    if (parts.length !== 2) {
      return false;
    }
    
    const [payloadBase64, providedSignature] = parts;
    
    // Verify signature using timing-safe comparison
    const expectedSignature = createSignature(payloadBase64, AUTH_SECRET);
    
    const providedBuffer = Buffer.from(providedSignature, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return false;
    }
    
    // Parse and validate payload
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8'));
    
    // Check expiration
    if (!payload.exp || payload.exp < Date.now()) {
      return false;
    }
    
    return true;
  } catch {
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const token = request.cookies.get(TOKEN_NAME)?.value;
  const isAuthenticated = token ? verifyToken(token) : false;

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
