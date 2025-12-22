import { NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 只显示环境变量是否存在，不暴露实际值
  const debugInfo = {
    nodeEnv: process.env.NODE_ENV,
    isProduction,
    hasAdminUsername: !!process.env.ADMIN_USERNAME,
    adminUsernameLength: process.env.ADMIN_USERNAME?.length || 0,
    hasAdminPassword: !!process.env.ADMIN_PASSWORD,
    adminPasswordLength: process.env.ADMIN_PASSWORD?.length || 0,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    authSecretLength: process.env.AUTH_SECRET?.length || 0,
    authSecretMinLength: 32,
    authSecretValid: (process.env.AUTH_SECRET?.length || 0) >= 32,
  };

  // 检查问题
  const issues: string[] = [];
  
  if (!process.env.ADMIN_USERNAME) {
    issues.push('ADMIN_USERNAME 环境变量未设置');
  }
  
  if (!process.env.ADMIN_PASSWORD) {
    issues.push('ADMIN_PASSWORD 环境变量未设置');
  }
  
  if (!process.env.AUTH_SECRET) {
    issues.push('AUTH_SECRET 环境变量未设置');
  } else if (process.env.AUTH_SECRET.length < 32) {
    issues.push(`AUTH_SECRET 长度不足：当前 ${process.env.AUTH_SECRET.length} 字符，需要至少 32 字符`);
  }

  return NextResponse.json({
    ...debugInfo,
    issues,
    allConfigured: issues.length === 0,
    message: issues.length === 0 
      ? '✅ 所有环境变量配置正确' 
      : '❌ 存在配置问题，请检查 issues 列表',
  });
}

