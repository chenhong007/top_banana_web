import { NextRequest, NextResponse } from 'next/server';
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
    
    // 创建响应对象
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
    });
    
    // 直接通过 headers 设置 Cookie（更可靠的方式，适用于 Vercel Serverless）
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieValue = [
      `${TOKEN_NAME}=${token}`,
      `Path=/`,
      `Max-Age=${TOKEN_MAX_AGE}`,
      `HttpOnly`,
      `SameSite=Lax`,
      isProduction ? 'Secure' : '',
    ].filter(Boolean).join('; ');
    
    response.headers.set('Set-Cookie', cookieValue);
    
    return response;
  } catch (error) {
    // Log error server-side only, don't expose details to client
    if (process.env.NODE_ENV !== 'production') {
      console.error('Login error:', error);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: '登录失败，请重试',
      },
      { status: 500 }
    );
  }
}
