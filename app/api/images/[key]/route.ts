/**
 * 图片代理 API
 * GET /api/images/[key] - 获取 R2 存储的图片
 * DELETE /api/images/[key] - 删除图片
 */

import { NextRequest, NextResponse } from 'next/server';
import { getImageFromR2, deleteImageFromR2, isR2Configured } from '@/lib/r2';
import prisma from '@/lib/db';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    if (!isR2Configured()) {
      return new NextResponse('R2 not configured', { status: 500 });
    }

    const imageBuffer = await getImageFromR2(decodedKey);

    if (!imageBuffer) {
      return new NextResponse('Image not found', { status: 404 });
    }

    const contentType = getContentType(decodedKey);

    return new NextResponse(imageBuffer, {
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
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: 'R2 not configured' },
        { status: 500 }
      );
    }

    // 从 R2 删除
    const deleted = await deleteImageFromR2(decodedKey);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '删除失败' },
        { status: 500 }
      );
    }

    // 更新数据库状态
    await prisma.image.updateMany({
      where: { key: decodedKey },
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

