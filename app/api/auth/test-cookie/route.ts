import { NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  const TOKEN_NAME = 'admin_token';
  const testToken = 'test_token_12345';
  const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
  const isProduction = process.env.NODE_ENV === 'production';
  
  const response = NextResponse.json({
    message: '测试 Cookie 设置',
    tokenName: TOKEN_NAME,
    isProduction,
  });

  // 方式1：使用 headers.set
  const cookieValue = [
    `${TOKEN_NAME}=${testToken}`,
    `Path=/`,
    `Max-Age=${TOKEN_MAX_AGE}`,
    `HttpOnly`,
    `SameSite=Lax`,
    isProduction ? 'Secure' : '',
  ].filter(Boolean).join('; ');
  
  response.headers.set('Set-Cookie', cookieValue);
  
  // 添加调试信息
  response.headers.set('X-Debug-Cookie-Value', cookieValue);
  
  return response;
}

