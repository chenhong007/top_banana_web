import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 检查环境变量
    const envUsername = process.env.ADMIN_USERNAME;
    const envPassword = process.env.ADMIN_PASSWORD;
    const authSecret = process.env.AUTH_SECRET;

    const result = {
      receivedUsername: username,
      receivedUsernameLength: username?.length || 0,
      receivedPassword: password ? '***' : null,
      receivedPasswordLength: password?.length || 0,
      envUsernameExists: !!envUsername,
      envUsernameLength: envUsername?.length || 0,
      envPasswordExists: !!envPassword,
      envPasswordLength: envPassword?.length || 0,
      authSecretExists: !!authSecret,
      authSecretLength: authSecret?.length || 0,
      // 直接比较（仅用于调试，之后删除）
      usernameMatch: username === envUsername,
      passwordMatch: password === envPassword,
      // 检查是否有额外空格或特殊字符
      usernameHasSpaces: username !== username?.trim(),
      passwordHasSpaces: password !== password?.trim(),
      envUsernameHasSpaces: envUsername !== envUsername?.trim(),
      envPasswordHasSpaces: envPassword !== envPassword?.trim(),
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      error: '解析请求失败',
      message: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}

