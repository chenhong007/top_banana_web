/**
 * 图片代理 API (Catch-all 路由)
 * GET /api/images/[...key] - 获取 R2 存储的图片
 * DELETE /api/images/[...key] - 删除图片
 * 
 * 说明：使用 [...key] catch-all 路由来支持包含斜杠的图片路径
 * 例如: /api/images/images/1234-xxx.jpg
 */

import { NextRequest, NextResponse } from 'next/server';
import { getImageFromR2, deleteImageFromR2, isR2Configured } from '@/lib/r2';
import prisma from '@/lib/db';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

// 根据文件扩展名获取 Content-Type
function getContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

// 从 catch-all 参数数组构建完整的 key
function buildKeyFromSegments(segments: string[]): string {
  // segments 是路径段数组，如 ['images', '1234-xxx.jpg']
  // 需要将它们拼接成完整路径 'images/1234-xxx.jpg'
  return segments.map(s => decodeURIComponent(s)).join('/');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keySegments } = await params;
    const fullKey = buildKeyFromSegments(keySegments);

    if (!isR2Configured()) {
      console.error('R2 not configured. Check environment variables: CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY');
      return new NextResponse('R2 not configured', { status: 500 });
    }

    const imageBuffer = await getImageFromR2(fullKey);

    if (!imageBuffer) {
      console.error(`Image not found in R2: ${fullKey}`);
      return new NextResponse('Image not found', { status: 404 });
    }

    const contentType = getContentType(fullKey);

    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keySegments } = await params;
    const fullKey = buildKeyFromSegments(keySegments);

    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: 'R2 not configured' },
        { status: 500 }
      );
    }

    // 从 R2 删除
    const deleted = await deleteImageFromR2(fullKey);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '删除失败' },
        { status: 500 }
      );
    }

    // 更新数据库状态
    await prisma.image.updateMany({
      where: { key: fullKey },
      data: { status: 'deleted' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}

