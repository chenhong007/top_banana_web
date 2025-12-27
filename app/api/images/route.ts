/**
 * 图片列表 API
 * GET /api/images - 获取所有已上传的图片列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { listImagesInR2, isR2Configured } from '@/lib/r2';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/security';

// 强制动态渲染，因为使用了 searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Admin-only: image inventory contains internal keys / originalUrl
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source') || 'db'; // 'db' 或 'r2'
    const status = searchParams.get('status') || 'active';

    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: 'Cloudflare R2 未配置' },
        { status: 500 }
      );
    }

    if (source === 'r2') {
      // 直接从 R2 获取列表
      const images = await listImagesInR2();
      return NextResponse.json({
        success: true,
        data: images,
      });
    }

    // 从数据库获取列表
    const images = await prisma.image.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        key: true,
        url: true,
        originalUrl: true,
        fileName: true,
        contentType: true,
        size: true,
        promptId: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: images,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get image list' },
      { status: 500 }
    );
  }
}

