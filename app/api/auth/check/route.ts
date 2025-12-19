import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authenticated = isAuthenticated(request);

  return NextResponse.json({
    success: true,
    authenticated,
  });
}

