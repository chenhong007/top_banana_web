import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOKEN_NAME = 'admin_token';
const AUTH_SECRET = process.env.AUTH_SECRET || 'your-secret-key-change-in-production';

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_NAME)?.value;
  const isAuthenticated = token ? verifyToken(token) : false;

  // Check if accessing protected routes
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route) && !pathname.startsWith('/login')
  );

  // Check if accessing auth routes (login page)
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

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

