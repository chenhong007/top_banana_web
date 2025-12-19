/**
 * 图片迁移 API
 * POST /api/images/migrate
 * 
 * 将数据库中现有的外部图片链接下载并上传到 R2，然后更新数据库链接
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadImageFromUrl, isR2Configured, isR2ImageUrl } from '@/lib/r2';
import prisma from '@/lib/db';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

interface MigrationResult {
  promptId: string;
  effect: string;
  originalUrl: string;
  newUrl?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: 'Cloudflare R2 未配置' },
        { status: 500 }
      );
    }

    const { dryRun = false, limit = 10 } = await request.json();

    // 获取所有有图片 URL 但还未迁移到 R2 的提示词
    const prompts = await prisma.prompt.findMany({
      where: {
        imageUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        effect: true,
        imageUrl: true,
      },
      take: limit,
    });

    // 过滤出需要迁移的（非 R2 URL）
    const promptsToMigrate = prompts.filter(p => {
      if (!p.imageUrl) return false;
      // 跳过已经是 R2 URL 的
      if (isR2ImageUrl(p.imageUrl)) return false;
      // 跳过本地图片路径（./data/image 或 data/image）
      if (p.imageUrl.startsWith('./data/') || p.imageUrl.startsWith('data/')) return false;
      return true;
    });

    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          dryRun: true,
          total: promptsToMigrate.length,
          prompts: promptsToMigrate.map(p => ({
            id: p.id,
            effect: p.effect,
            imageUrl: p.imageUrl,
          })),
        },
      });
    }

    const results: MigrationResult[] = [];

    for (const prompt of promptsToMigrate) {
      try {
        const result = await uploadImageFromUrl(prompt.imageUrl!);

        if (result.success && result.url) {
          // 更新数据库中的图片 URL
          await prisma.prompt.update({
            where: { id: prompt.id },
            data: { imageUrl: result.url },
          });

          // 记录到 Image 表
          await prisma.image.create({
            data: {
              key: result.key!,
              originalUrl: prompt.imageUrl!,
              url: result.url,
              promptId: prompt.id,
              status: 'active',
            },
          });

          results.push({
            promptId: prompt.id,
            effect: prompt.effect,
            originalUrl: prompt.imageUrl!,
            newUrl: result.url,
          });
        } else {
          results.push({
            promptId: prompt.id,
            effect: prompt.effect,
            originalUrl: prompt.imageUrl!,
            error: result.error || '上传失败',
          });
        }
      } catch (error) {
        results.push({
          promptId: prompt.id,
          effect: prompt.effect,
          originalUrl: prompt.imageUrl!,
          error: error instanceof Error ? error.message : '迁移失败',
        });
      }
    }

    const successCount = results.filter(r => r.newUrl).length;

    return NextResponse.json({
      success: true,
      data: {
        total: promptsToMigrate.length,
        success: successCount,
        failed: promptsToMigrate.length - successCount,
        results,
      },
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '迁移失败' },
      { status: 500 }
    );
  }
}

// GET 获取迁移状态统计
export async function GET() {
  try {
    // 统计各类型图片数量
    const [total, migrated, pending, localImages] = await Promise.all([
      // 总数（有图片 URL 的）
      prisma.prompt.count({
        where: { imageUrl: { not: null } },
      }),
      // 已迁移到 R2 的（Image 表中有记录的）
      prisma.image.count({
        where: { status: 'active' },
      }),
      // 待迁移的外部 URL
      prisma.prompt.count({
        where: {
          imageUrl: {
            not: null,
            startsWith: 'http',
          },
        },
      }),
      // 本地图片
      prisma.prompt.count({
        where: {
          OR: [
            { imageUrl: { startsWith: './data/' } },
            { imageUrl: { startsWith: 'data/' } },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total,
        migrated,
        pending,
        localImages,
        r2Configured: isR2Configured(),
      },
    });
  } catch (error) {
    console.error('Error getting migration status:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取状态失败' },
      { status: 500 }
    );
  }
}

