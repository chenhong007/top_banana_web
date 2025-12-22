import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, generateToken, verifyToken } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const TOKEN_NAME = 'admin_token';

/**
 * 综合诊断 API - 用于一次性检查所有登录相关配置
 * GET: 检查环境变量和 Cookie 状态
 * POST: 测试完整登录流程
 */
export async function GET(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  const existingToken = request.cookies.get(TOKEN_NAME)?.value;
  const hostname = request.headers.get('host') || '';
  
  // 检查环境变量
  const envCheck = {
    nodeEnv: process.env.NODE_ENV,
    isProduction,
    adminUsername: {
      exists: !!process.env.ADMIN_USERNAME,
      length: process.env.ADMIN_USERNAME?.length || 0,
      hasSpaces: process.env.ADMIN_USERNAME !== process.env.ADMIN_USERNAME?.trim(),
    },
    adminPassword: {
      exists: !!process.env.ADMIN_PASSWORD,
      length: process.env.ADMIN_PASSWORD?.length || 0,
      hasSpaces: process.env.ADMIN_PASSWORD !== process.env.ADMIN_PASSWORD?.trim(),
    },
    authSecret: {
      exists: !!process.env.AUTH_SECRET,
      length: process.env.AUTH_SECRET?.length || 0,
      minLength: 32,
      meetsMinLength: (process.env.AUTH_SECRET?.length || 0) >= 32,
    },
  };

  // 检查域名访问控制
  const SHOW_ADMIN_ENTRY = process.env.NEXT_PUBLIC_SHOW_ADMIN_ENTRY !== 'false';
  const ADMIN_ALLOWED_DOMAINS = (process.env.NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS || '')
    .split(',')
    .map(d => d.trim().toLowerCase())
    .filter(Boolean);
  
  const domainCheck = {
    currentHost: hostname,
    showAdminEntry: SHOW_ADMIN_ENTRY,
    showAdminEntryEnvValue: process.env.NEXT_PUBLIC_SHOW_ADMIN_ENTRY || '(not set)',
    allowedDomains: ADMIN_ALLOWED_DOMAINS.length > 0 ? ADMIN_ALLOWED_DOMAINS : '(all domains allowed)',
    allowedDomainsEnvValue: process.env.NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS || '(not set)',
    isCurrentDomainAllowed: ADMIN_ALLOWED_DOMAINS.length === 0 || ADMIN_ALLOWED_DOMAINS.some(domain => 
      hostname.toLowerCase() === domain || 
      hostname.toLowerCase().endsWith(`.${domain}`) ||
      (domain.includes('vercel.app') && hostname.includes('vercel.app'))
    ),
  };

  // 检查现有 Cookie
  const cookieCheck = {
    tokenExists: !!existingToken,
    tokenLength: existingToken?.length || 0,
    tokenValid: existingToken ? verifyToken(existingToken).valid : null,
    tokenUsername: existingToken ? verifyToken(existingToken).username : null,
  };

  // 汇总问题
  const issues: string[] = [];
  
  if (!envCheck.adminUsername.exists) {
    issues.push('❌ ADMIN_USERNAME 环境变量未设置');
  } else if (envCheck.adminUsername.hasSpaces) {
    issues.push('⚠️ ADMIN_USERNAME 包含前导或尾随空格');
  }
  
  if (!envCheck.adminPassword.exists) {
    issues.push('❌ ADMIN_PASSWORD 环境变量未设置');
  } else if (envCheck.adminPassword.hasSpaces) {
    issues.push('⚠️ ADMIN_PASSWORD 包含前导或尾随空格');
  }
  
  if (!envCheck.authSecret.exists) {
    issues.push('❌ AUTH_SECRET 环境变量未设置');
  } else if (!envCheck.authSecret.meetsMinLength) {
    issues.push(`❌ AUTH_SECRET 长度不足：当前 ${envCheck.authSecret.length} 字符，需要至少 32 字符`);
  }

  if (cookieCheck.tokenExists && !cookieCheck.tokenValid) {
    issues.push('⚠️ 存在无效的 admin_token Cookie（可能过期或签名不匹配）');
  }

  // 域名访问控制问题
  if (!domainCheck.showAdminEntry) {
    issues.push('❌ NEXT_PUBLIC_SHOW_ADMIN_ENTRY 设置为 false，后台入口已禁用');
  }
  
  if (!domainCheck.isCurrentDomainAllowed) {
    issues.push(`❌ 当前域名 ${hostname} 不在允许列表中，无法访问后台`);
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    envCheck,
    domainCheck,
    cookieCheck,
    issues,
    allConfigured: issues.filter(i => i.startsWith('❌')).length === 0,
    summary: issues.length === 0 
      ? '✅ 所有配置正确' 
      : `发现 ${issues.length} 个问题`,
  });
}

export async function POST(request: NextRequest) {
  const steps: Record<string, unknown> = {};
  
  try {
    // Step 1: 解析请求
    steps.step1_parseRequest = 'starting';
    const body = await request.json();
    const { username, password } = body;
    steps.step1_parseRequest = '✅ success';
    steps.receivedData = {
      username: username || '(empty)',
      usernameLength: username?.length || 0,
      passwordLength: password?.length || 0,
      usernameHasSpaces: username !== username?.trim(),
      passwordHasSpaces: password !== password?.trim(),
    };

    // Step 2: 验证凭证
    steps.step2_validateCredentials = 'starting';
    try {
      const isValid = validateCredentials(username, password);
      steps.step2_validateCredentials = isValid ? '✅ valid' : '❌ invalid';
      steps.credentialsValid = isValid;
      
      if (!isValid) {
        // 提供更多调试信息
        const envUsername = process.env.ADMIN_USERNAME;
        const envPassword = process.env.ADMIN_PASSWORD;
        steps.credentialsDebug = {
          envUsernameLength: envUsername?.length || 0,
          envPasswordLength: envPassword?.length || 0,
          usernameMatch: username === envUsername,
          passwordMatch: password === envPassword,
          // 字符级别对比（仅前3个字符）
          usernamePrefix: username?.substring(0, 3) || '',
          envUsernamePrefix: envUsername?.substring(0, 3) || '',
        };
      }
    } catch (error) {
      steps.step2_validateCredentials = '❌ error';
      steps.step2_error = error instanceof Error ? error.message : String(error);
    }

    // Step 3: 生成 Token
    if (steps.credentialsValid) {
      steps.step3_generateToken = 'starting';
      try {
        const token = generateToken(username);
        steps.step3_generateToken = '✅ success';
        steps.tokenInfo = {
          generated: true,
          length: token.length,
          preview: `${token.substring(0, 20)}...`,
        };
        
        // Step 4: 验证生成的 Token
        steps.step4_verifyToken = 'starting';
        const verification = verifyToken(token);
        steps.step4_verifyToken = verification.valid ? '✅ valid' : '❌ invalid';
        steps.tokenVerification = verification;
        
        // Step 5: 测试 Cookie 设置
        steps.step5_setCookie = 'testing';
        const response = NextResponse.json({
          success: true,
          message: '诊断完成 - 登录流程正常',
          steps,
        });
        
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieValue = [
          `${TOKEN_NAME}=${token}`,
          `Path=/`,
          `Max-Age=${60 * 60 * 24 * 7}`,
          `HttpOnly`,
          `SameSite=Lax`,
          isProduction ? 'Secure' : '',
        ].filter(Boolean).join('; ');
        
        response.headers.set('Set-Cookie', cookieValue);
        steps.step5_setCookie = '✅ cookie set';
        steps.cookieDetails = {
          name: TOKEN_NAME,
          secure: isProduction,
          sameSite: 'Lax',
          httpOnly: true,
          maxAge: '7 days',
        };
        
        return response;
      } catch (error) {
        steps.step3_generateToken = '❌ error';
        steps.step3_error = error instanceof Error ? error.message : String(error);
      }
    }

    return NextResponse.json({
      success: steps.credentialsValid === true,
      message: steps.credentialsValid ? '诊断完成' : '凭证验证失败',
      steps,
    }, { status: steps.credentialsValid ? 200 : 401 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      steps,
    }, { status: 500 });
  }
}

