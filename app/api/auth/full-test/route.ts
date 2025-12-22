import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export const dynamic = 'force-dynamic';

const TOKEN_NAME = 'admin_token';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * 完整登录流程测试 API
 * GET: 查看当前状态和所有配置
 * POST: 执行完整登录测试并设置 Cookie
 */

interface TestResult {
  step: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  details?: unknown;
}

export async function GET(request: NextRequest) {
  const results: TestResult[] = [];
  const token = request.cookies.get(TOKEN_NAME)?.value;
  
  // ========== 1. 环境变量检查 ==========
  const envVars = {
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SHOW_ADMIN_ENTRY: process.env.NEXT_PUBLIC_SHOW_ADMIN_ENTRY,
    NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS: process.env.NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS,
  };

  if (!envVars.ADMIN_USERNAME) {
    results.push({ step: '环境变量-用户名', status: 'fail', message: 'ADMIN_USERNAME 未设置' });
  } else {
    results.push({ step: '环境变量-用户名', status: 'pass', message: `已设置 (${envVars.ADMIN_USERNAME.length}字符)` });
  }

  if (!envVars.ADMIN_PASSWORD) {
    results.push({ step: '环境变量-密码', status: 'fail', message: 'ADMIN_PASSWORD 未设置' });
  } else {
    results.push({ step: '环境变量-密码', status: 'pass', message: `已设置 (${envVars.ADMIN_PASSWORD.length}字符)` });
  }

  if (!envVars.AUTH_SECRET) {
    results.push({ step: '环境变量-密钥', status: 'fail', message: 'AUTH_SECRET 未设置' });
  } else if (envVars.AUTH_SECRET.length < 32) {
    results.push({ step: '环境变量-密钥', status: 'fail', message: `AUTH_SECRET 太短 (${envVars.AUTH_SECRET.length}字符，需要>=32)` });
  } else {
    results.push({ step: '环境变量-密钥', status: 'pass', message: `已设置 (${envVars.AUTH_SECRET.length}字符)` });
  }

  // ========== 2. 域名访问控制检查 ==========
  const hostname = request.headers.get('host') || '';
  const showAdminEntry = envVars.NEXT_PUBLIC_SHOW_ADMIN_ENTRY !== 'false';
  const allowedDomains = (envVars.NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS || '')
    .split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  
  if (!showAdminEntry) {
    results.push({ step: '后台入口开关', status: 'fail', message: 'NEXT_PUBLIC_SHOW_ADMIN_ENTRY 设为 false，后台被禁用' });
  } else {
    results.push({ step: '后台入口开关', status: 'pass', message: '后台入口已启用' });
  }

  const isDomainAllowed = allowedDomains.length === 0 || allowedDomains.some(domain => 
    hostname.toLowerCase() === domain || hostname.toLowerCase().endsWith(`.${domain}`)
  );

  if (!isDomainAllowed) {
    results.push({ 
      step: '域名访问控制', 
      status: 'fail', 
      message: `当前域名 "${hostname}" 不在允许列表中`,
      details: { allowedDomains, currentHost: hostname }
    });
  } else {
    results.push({ step: '域名访问控制', status: 'pass', message: `域名 "${hostname}" 已允许访问` });
  }

  // ========== 3. Cookie 检查 ==========
  if (!token) {
    results.push({ step: 'Cookie检查', status: 'fail', message: '未找到 admin_token Cookie，需要登录' });
  } else {
    results.push({ step: 'Cookie检查', status: 'pass', message: `Cookie 存在 (${token.length}字符)` });
    
    // ========== 4. Token 格式检查 ==========
    const parts = token.split('.');
    if (parts.length !== 2) {
      results.push({ step: 'Token格式', status: 'fail', message: `Token 格式错误，应有2部分，实际${parts.length}部分` });
    } else {
      results.push({ step: 'Token格式', status: 'pass', message: 'Token 格式正确' });
      
      const [payloadBase64, providedSignature] = parts;
      
      // ========== 5. Payload 解析检查 ==========
      try {
        const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
        const payload = JSON.parse(payloadJson);
        
        results.push({ 
          step: 'Payload解析', 
          status: 'pass', 
          message: '解析成功',
          details: { username: payload.username, exp: new Date(payload.exp).toISOString() }
        });
        
        // ========== 6. Token 过期检查 ==========
        if (payload.exp < Date.now()) {
          results.push({ step: 'Token过期检查', status: 'fail', message: `Token 已过期于 ${new Date(payload.exp).toISOString()}` });
        } else {
          results.push({ step: 'Token过期检查', status: 'pass', message: `Token 有效至 ${new Date(payload.exp).toISOString()}` });
        }
        
        // ========== 7. 签名验证 ==========
        if (envVars.AUTH_SECRET) {
          const expectedSignature = createHmac('sha256', envVars.AUTH_SECRET)
            .update(payloadBase64)
            .digest('hex');
          
          if (providedSignature === expectedSignature) {
            results.push({ step: '签名验证', status: 'pass', message: '签名验证通过 ✓' });
          } else {
            results.push({ 
              step: '签名验证', 
              status: 'fail', 
              message: '签名不匹配！这是登录失败的根本原因',
              details: {
                provided: providedSignature.substring(0, 16) + '...',
                expected: expectedSignature.substring(0, 16) + '...',
                hint: 'AUTH_SECRET 可能在登录后被修改过，或存在多个部署使用不同的密钥'
              }
            });
          }
        }
      } catch (e) {
        results.push({ step: 'Payload解析', status: 'fail', message: `解析失败: ${e instanceof Error ? e.message : String(e)}` });
      }
    }
  }

  // ========== 汇总 ==========
  const failCount = results.filter(r => r.status === 'fail').length;
  const passCount = results.filter(r => r.status === 'pass').length;
  
  return NextResponse.json({
    summary: failCount === 0 
      ? `✅ 全部 ${passCount} 项检查通过！应该可以访问后台了`
      : `❌ ${failCount} 项检查失败，${passCount} 项通过`,
    failedSteps: results.filter(r => r.status === 'fail'),
    allResults: results,
    recommendation: failCount > 0 
      ? getRecommendation(results.filter(r => r.status === 'fail'))
      : '请尝试访问 /admin，应该可以正常进入后台',
  });
}

function getRecommendation(failedResults: TestResult[]): string {
  for (const result of failedResults) {
    if (result.step === '签名验证') {
      return '🔧 解决方案：签名不匹配通常是因为 AUTH_SECRET 被修改。请重新登录（先访问 /api/auth/logout 登出，再登录）';
    }
    if (result.step === 'Cookie检查') {
      return '🔧 解决方案：没有 Cookie，请先登录。访问 /login 进行登录';
    }
    if (result.step === 'Token过期检查') {
      return '🔧 解决方案：Token 已过期，请重新登录';
    }
    if (result.step.includes('环境变量')) {
      return '🔧 解决方案：请在 Vercel 后台设置缺失的环境变量，然后重新部署';
    }
    if (result.step === '域名访问控制') {
      return '🔧 解决方案：请在 NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS 中添加当前域名';
    }
  }
  return '请根据失败的检查项进行修复';
}

export async function POST(request: NextRequest) {
  const results: TestResult[] = [];
  
  try {
    // 解析请求
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: '请提供 username 和 password',
        usage: 'POST /api/auth/full-test with JSON body: {"username": "xxx", "password": "xxx"}'
      }, { status: 400 });
    }

    // 验证凭证
    const envUsername = process.env.ADMIN_USERNAME;
    const envPassword = process.env.ADMIN_PASSWORD;
    const authSecret = process.env.AUTH_SECRET;

    if (!envUsername || !envPassword || !authSecret) {
      return NextResponse.json({
        success: false,
        error: '服务器环境变量未配置',
        missing: {
          ADMIN_USERNAME: !envUsername,
          ADMIN_PASSWORD: !envPassword,
          AUTH_SECRET: !authSecret,
        }
      }, { status: 500 });
    }

    // 检查凭证
    const usernameMatch = username === envUsername;
    const passwordMatch = password === envPassword;

    results.push({
      step: '用户名验证',
      status: usernameMatch ? 'pass' : 'fail',
      message: usernameMatch ? '用户名正确' : `用户名错误 (输入${username.length}字符，期望${envUsername.length}字符)`,
    });

    results.push({
      step: '密码验证',
      status: passwordMatch ? 'pass' : 'fail',
      message: passwordMatch ? '密码正确' : `密码错误 (输入${password.length}字符，期望${envPassword.length}字符)`,
    });

    if (!usernameMatch || !passwordMatch) {
      return NextResponse.json({
        success: false,
        message: '凭证验证失败',
        results,
      }, { status: 401 });
    }

    // 生成 Token
    const payload = {
      username,
      exp: Date.now() + TOKEN_MAX_AGE * 1000,
      iat: Date.now(),
    };
    
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', authSecret).update(payloadBase64).digest('hex');
    const token = `${payloadBase64}.${signature}`;

    results.push({
      step: 'Token生成',
      status: 'pass',
      message: `Token 生成成功 (${token.length}字符)`,
    });

    // 验证生成的 Token
    const expectedSignature = createHmac('sha256', authSecret).update(payloadBase64).digest('hex');
    const signatureValid = signature === expectedSignature;

    results.push({
      step: 'Token自验证',
      status: signatureValid ? 'pass' : 'fail',
      message: signatureValid ? '签名自验证通过' : '签名自验证失败（严重错误）',
    });

    // 创建响应并设置 Cookie
    const response = NextResponse.json({
      success: true,
      message: '登录成功！Cookie 已设置',
      results,
      nextStep: '请访问 /admin 进入后台',
      tokenPreview: token.substring(0, 50) + '...',
    });

    // 设置 Cookie
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

    results.push({
      step: 'Cookie设置',
      status: 'pass',
      message: `Cookie 已设置 (${isProduction ? 'Secure, ' : ''}HttpOnly, SameSite=Lax)`,
    });

    return response;

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      results,
    }, { status: 500 });
  }
}

