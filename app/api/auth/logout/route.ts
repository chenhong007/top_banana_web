import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const TOKEN_NAME = 'admin_token';

export async function POST() {
  // 使用 next/headers 的 cookies() 来删除 Cookie
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);

  return NextResponse.json({
    success: true,
    message: '已退出登录',
  });
}

