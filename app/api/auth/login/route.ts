import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCredentials, generateToken } from '@/lib/auth';
import { 
  checkRateLimit, 
  recordLoginAttempt, 
  clearRateLimit, 
  getClientIdentifier 
} from '@/lib/rate-limiter';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const TOKEN_NAME = 'admin_token';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    // Get client identifier for rate limiting
    const clientId = getClientIdentifier(request);
    
    // Check rate limit before processing
    const rateLimitResult = checkRateLimit(clientId);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: rateLimitResult.message || '请求过于频繁，请稍后重试',
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfterSeconds || 60),
          },
        }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    // Record the login attempt before validation
    recordLoginAttempt(clientId);

    if (!validateCredentials(username, password)) {
      // Include remaining attempts in response for user feedback
      const newRateLimitResult = checkRateLimit(clientId);
      
      return NextResponse.json(
        { 
          success: false, 
          error: '用户名或密码错误',
          remainingAttempts: newRateLimitResult.remaining,
        },
        { status: 401 }
      );
    }

    // Successful login - clear rate limit for this client
    clearRateLimit(clientId);

    const token = generateToken(username);
    
    // 使用 next/headers 的 cookies() 来设置 Cookie
    const cookieStore = await cookies();
    cookieStore.set(TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_MAX_AGE,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: '登录成功',
    });
  } catch (error) {
    console.error('Login error:', error);
    // 返回更详细的错误信息用于调试
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { 
        success: false, 
        error: '登录失败，请重试',
        debug: process.env.NODE_ENV === 'production' ? undefined : errorMessage,
        // 临时添加：帮助诊断生产环境问题
        errorDetail: errorMessage,
      },
      { status: 500 }
    );
  }
}
