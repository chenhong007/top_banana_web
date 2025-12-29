/**
 * 图片迁移 API
 * POST /api/images/migrate
 * 
 * 将数据库中现有的外部图片链接下载并上传到 R2，然后更新数据库链接
 * 
 * 请求参数：
 * - dryRun: boolean - 预览模式，不执行实际迁移
 * - limit: number - 每次处理的 Prompt 数量（默认 10）
 * - offset: number - 从第几条开始（默认 0，用于分页）
 * - includeLocal: boolean - 是否包含本地图片（默认 false）
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadImageFromUrl, isR2Configured, isR2ImageUrl, getPublicUrl } from '@/lib/r2';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/security';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

interface MigrationResult {
  promptId: string;
  effect: string;
  images: {
    originalUrl: string;
    newUrl?: string;
    error?: string;
  }[];
}

/**
 * 判断是否是本地图片路径
 */
function isLocalImagePath(url: string): boolean {
  return url.startsWith('./data/') || url.startsWith('data/');
}

/**
 * 判断 URL 是否需要迁移
 */
function needsMigration(url: string, includeLocal: boolean): boolean {
  if (!url) return false;
  // 已经是 R2 URL，不需要迁移
  if (isR2ImageUrl(url)) return false;
  // 本地图片，根据参数决定
  if (isLocalImagePath(url)) return includeLocal;
  // 其他 HTTP URL 需要迁移
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * 收集所有需要迁移的图片 URL
 */
function collectUrlsToMigrate(
  imageUrl: string | null,
  imageUrls: string[] | null,
  includeLocal: boolean
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  // 先处理 imageUrls 数组
  if (imageUrls && Array.isArray(imageUrls)) {
    for (const url of imageUrls) {
      if (url && typeof url === 'string' && !seen.has(url)) {
        if (needsMigration(url, includeLocal)) {
          urls.push(url);
          seen.add(url);
        }
      }
    }
  }

  // 再处理 imageUrl
  if (imageUrl && typeof imageUrl === 'string' && !seen.has(imageUrl)) {
    if (needsMigration(imageUrl, includeLocal)) {
      urls.push(imageUrl);
      seen.add(imageUrl);
    }
  }

  return urls;
}

export async function POST(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: 'Cloudflare R2 未配置' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { 
      dryRun = false, 
      limit = 10, 
      offset = 0,
      includeLocal = false 
    } = body as { 
      dryRun?: boolean; 
      limit?: number; 
      offset?: number;
      includeLocal?: boolean;
    };

    // 获取所有有图片 URL 的 Prompt
    const prompts = await prisma.prompt.findMany({
      where: {
        OR: [
          { imageUrl: { not: null } },
          { imageUrls: { isEmpty: false } },
        ],
      },
      select: {
        id: true,
        effect: true,
        imageUrl: true,
        imageUrls: true,
      },
      skip: offset,
      take: limit,
      orderBy: { id: 'asc' },
    });

    // 过滤出需要迁移的 Prompt
    const promptsToMigrate = prompts.filter(p => {
      const urlsToMigrate = collectUrlsToMigrate(p.imageUrl, p.imageUrls, includeLocal);
      return urlsToMigrate.length > 0;
    });

    // 统计总需要迁移的图片数量
    let totalImageCount = 0;
    for (const p of promptsToMigrate) {
      totalImageCount += collectUrlsToMigrate(p.imageUrl, p.imageUrls, includeLocal).length;
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          dryRun: true,
          offset,
          limit,
          promptCount: promptsToMigrate.length,
          imageCount: totalImageCount,
          prompts: promptsToMigrate.map(p => ({
            id: p.id,
            effect: p.effect,
            imagesToMigrate: collectUrlsToMigrate(p.imageUrl, p.imageUrls, includeLocal),
          })),
        },
      });
    }

    const results: MigrationResult[] = [];
    let successImageCount = 0;
    let failedImageCount = 0;

    for (const prompt of promptsToMigrate) {
      const urlsToMigrate = collectUrlsToMigrate(prompt.imageUrl, prompt.imageUrls, includeLocal);
      const imageResults: MigrationResult['images'] = [];
      const urlMapping = new Map<string, string>();

      // 处理每个需要迁移的图片
      for (const originalUrl of urlsToMigrate) {
        try {
          console.log(`[Migrate] Processing: ${originalUrl.substring(0, 100)}...`);
          const result = await uploadImageFromUrl(originalUrl);

          if (result.success && result.url) {
            urlMapping.set(originalUrl, result.url);
            imageResults.push({
              originalUrl,
              newUrl: result.url,
            });
            successImageCount++;
            console.log(`[Migrate] Success: ${originalUrl.substring(0, 60)}... -> ${result.url}`);

            // 记录到 Image 表
            try {
              await prisma.image.create({
                data: {
                  key: result.key!,
                  originalUrl: originalUrl,
                  url: result.url,
                  promptId: prompt.id,
                  status: 'active',
                },
              });
            } catch {
              // Image 表记录失败不影响整体流程
            }
          } else {
            console.error(`[Migrate] Failed: ${originalUrl.substring(0, 80)}... Error: ${result.error}`);
            imageResults.push({
              originalUrl,
              error: result.error || '上传失败',
            });
            failedImageCount++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : '迁移失败';
          console.error(`[Migrate] Exception: ${originalUrl.substring(0, 80)}... Error: ${errorMsg}`);
          imageResults.push({
            originalUrl,
            error: errorMsg,
          });
          failedImageCount++;
        }
      }

      // 更新数据库中的图片 URL
      if (urlMapping.size > 0) {
        try {
          // 替换 imageUrl
          let newImageUrl = prompt.imageUrl;
          if (newImageUrl && urlMapping.has(newImageUrl)) {
            newImageUrl = urlMapping.get(newImageUrl)!;
          }

          // 替换 imageUrls 数组中的 URL
          const newImageUrls = (prompt.imageUrls || []).map(url => {
            if (urlMapping.has(url)) {
              return urlMapping.get(url)!;
            }
            return url;
          });

          await prisma.prompt.update({
            where: { id: prompt.id },
            data: {
              imageUrl: newImageUrl,
              imageUrls: newImageUrls,
            },
          });
        } catch (error) {
          // 数据库更新失败，记录错误
          imageResults.push({
            originalUrl: '(database update)',
            error: error instanceof Error ? error.message : '数据库更新失败',
          });
        }
      }

      results.push({
        promptId: prompt.id,
        effect: prompt.effect,
        images: imageResults,
      });
    }

    const successPromptCount = results.filter(r => 
      r.images.every(img => img.newUrl)
    ).length;

    // 基于获取的 Prompt 数量判断是否有下一页（而不是过滤后的数量）
    const hasMorePrompts = prompts.length === limit;

    return NextResponse.json({
      success: true,
      data: {
        offset,
        limit,
        prompt: {
          total: promptsToMigrate.length,
          success: successPromptCount,
          partial: results.filter(r => 
            r.images.some(img => img.newUrl) && r.images.some(img => img.error)
          ).length,
          failed: results.filter(r => 
            r.images.every(img => img.error)
          ).length,
        },
        image: {
          total: totalImageCount,
          success: successImageCount,
          failed: failedImageCount,
        },
        results,
        // 基于获取的总数判断是否有下一页
        nextOffset: hasMorePrompts ? offset + limit : null,
      },
    });
  } catch (error) {
    console.error('[Migrate] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Migration failed' },
      { status: 500 }
    );
  }
}

// GET 获取迁移状态统计
export async function GET(request: NextRequest) {
  // Check authentication (admin-only)
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    // 获取所有 Prompt 的图片信息
    const allPrompts = await prisma.prompt.findMany({
      where: {
        OR: [
          { imageUrl: { not: null } },
          { imageUrls: { isEmpty: false } },
        ],
      },
      select: {
        imageUrl: true,
        imageUrls: true,
      },
    });

    // 统计各类型图片数量
    let totalImages = 0;
    let r2Images = 0;
    let externalImages = 0;
    let localImages = 0;

    for (const prompt of allPrompts) {
      // 收集所有图片 URL
      const urls: string[] = [];
      if (prompt.imageUrl) urls.push(prompt.imageUrl);
      if (prompt.imageUrls) urls.push(...prompt.imageUrls);

      // 去重
      const uniqueUrls = [...new Set(urls)];

      for (const url of uniqueUrls) {
        if (!url) continue;
        totalImages++;
        
        if (isR2ImageUrl(url)) {
          r2Images++;
        } else if (isLocalImagePath(url)) {
          localImages++;
        } else if (url.startsWith('http://') || url.startsWith('https://')) {
          externalImages++;
        }
      }
    }

    // 获取 Image 表中的记录数（已成功迁移的）
    const migratedCount = await prisma.image.count({
      where: { status: 'active' },
    });

    return NextResponse.json({
      success: true,
      data: {
        prompts: {
          total: allPrompts.length,
          withImages: allPrompts.filter(p => 
            (p.imageUrl || (p.imageUrls && p.imageUrls.length > 0))
          ).length,
        },
        images: {
          total: totalImages,
          r2: r2Images,
          external: externalImages,
          local: localImages,
          migrated: migratedCount,
          pending: externalImages, // 待迁移的外部图片
        },
        r2Configured: isR2Configured(),
        usage: {
          POST: '/api/images/migrate',
          body: {
            dryRun: '预览模式，不执行实际迁移 (默认: false)',
            limit: '每次处理的 Prompt 数量 (默认: 10)',
            offset: '从第几条开始 (默认: 0，用于分页)',
            includeLocal: '是否包含本地图片 (默认: false)',
          },
          example: {
            '预览': 'POST { "dryRun": true, "limit": 20 }',
            '执行迁移': 'POST { "limit": 10 }',
            '分页迁移': 'POST { "limit": 10, "offset": 10 }',
          },
        },
      },
    });
  } catch (error) {
    console.error('[Migrate] GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
