import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: '已退出登录',
  });

  return clearAuthCookie(response);
}

