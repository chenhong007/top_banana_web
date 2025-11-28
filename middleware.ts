import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOKEN_NAME = 'admin_token';
const AUTH_SECRET = process.env.AUTH_SECRET || 'your-secret-key-change-in-production';

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
 * Simple token verification in middleware
 */
function verifyToken(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    return payload.secret === AUTH_SECRET && payload.exp > Date.now();
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

