import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TOKEN_NAME = 'admin_token';

/**
 * 调试中间件 Token 验证问题
 * 这个 API 模拟中间件的验证逻辑，看看是否有差异
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(TOKEN_NAME)?.value;
  const allCookies = request.cookies.getAll();
  
  // 检查所有 Cookie
  const cookieInfo = {
    allCookies: allCookies.map(c => ({ name: c.name, valueLength: c.value.length })),
    adminTokenExists: !!token,
    adminTokenLength: token?.length || 0,
    adminTokenPreview: token ? `${token.substring(0, 30)}...` : null,
  };

  // 尝试解析 Token
  let tokenAnalysis: Record<string, unknown> = {};
  
  if (token) {
    const parts = token.split('.');
    tokenAnalysis.partsCount = parts.length;
    tokenAnalysis.validFormat = parts.length === 2;
    
    if (parts.length === 2) {
      const [payloadBase64, signature] = parts;
      tokenAnalysis.payloadBase64Length = payloadBase64.length;
      tokenAnalysis.signatureLength = signature.length;
      
      try {
        // 尝试解码 payload
        const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
        const payload = JSON.parse(payloadJson);
        tokenAnalysis.payload = {
          username: payload.username,
          exp: payload.exp,
          expDate: new Date(payload.exp).toISOString(),
          isExpired: payload.exp < Date.now(),
          iat: payload.iat,
          iatDate: payload.iat ? new Date(payload.iat).toISOString() : null,
        };
      } catch (e) {
        tokenAnalysis.payloadError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  // 检查环境变量
  const envInfo = {
    authSecretExists: !!process.env.AUTH_SECRET,
    authSecretLength: process.env.AUTH_SECRET?.length || 0,
    nodeEnv: process.env.NODE_ENV,
  };

  // 手动验证签名
  let signatureVerification: Record<string, unknown> = {};
  
  if (token && process.env.AUTH_SECRET) {
    const parts = token.split('.');
    if (parts.length === 2) {
      const [payloadBase64, providedSignature] = parts;
      
      try {
        // 动态导入 crypto（确保在 Node.js runtime 中）
        const { createHmac } = await import('crypto');
        const expectedSignature = createHmac('sha256', process.env.AUTH_SECRET)
          .update(payloadBase64)
          .digest('hex');
        
        signatureVerification = {
          providedSignatureLength: providedSignature.length,
          expectedSignatureLength: expectedSignature.length,
          signaturesMatch: providedSignature === expectedSignature,
          providedSignaturePreview: providedSignature.substring(0, 20) + '...',
          expectedSignaturePreview: expectedSignature.substring(0, 20) + '...',
        };
      } catch (e) {
        signatureVerification.error = e instanceof Error ? e.message : String(e);
      }
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    cookieInfo,
    tokenAnalysis,
    envInfo,
    signatureVerification,
    conclusion: signatureVerification.signaturesMatch 
      ? '✅ Token 验证应该通过' 
      : '❌ Token 签名不匹配 - 这就是问题所在',
  });
}

