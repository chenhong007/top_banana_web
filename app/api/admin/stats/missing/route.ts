/**
 * Missing Data Stats API
 * GET /api/admin/stats/missing - Get statistics about missing/incomplete data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/security';
import { isR2ImageUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

// R2 公共 URL 前缀
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';

/**
 * 判断图片是否有效（存在且是R2图片）
 */
function isValidR2Image(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return false;
  return isR2ImageUrl(url);
}

/**
 * 检查 prompt 是否有有效的图片
 */
function hasValidImages(imageUrl: string | null | undefined, imageUrls: string[] | undefined): boolean {
  // 检查主图
  if (isValidR2Image(imageUrl)) return true;
  
  // 检查图片数组
  if (imageUrls && Array.isArray(imageUrls)) {
    return imageUrls.some(url => isValidR2Image(url));
  }
  
  return false;
}

/**
 * 检查是否有非R2的图片（需要迁移的图片）
 */
function hasNonR2Images(imageUrl: string | null | undefined, imageUrls: string[] | undefined): boolean {
  // 检查主图 - 有值但不是R2图片
  if (imageUrl && imageUrl.trim() !== '' && !isR2ImageUrl(imageUrl)) {
    return true;
  }
  
  // 检查图片数组
  if (imageUrls && Array.isArray(imageUrls)) {
    return imageUrls.some(url => url && url.trim() !== '' && !isR2ImageUrl(url));
  }
  
  return false;
}

export interface MissingStats {
  total: number;
  noImage: number;           // 没有任何图片
  nonR2Image: number;        // 有图片但不是R2图片（需要迁移）
  noTags: number;            // 没有场景标签
  noModelTags: number;       // 没有模型标签
  noDescription: number;     // 没有描述
  noSource: number;          // 没有来源
  noCategory: number;        // 没有分类
  completeCount: number;     // 完整数据数量
}

export async function GET(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    // 获取所有 prompts 的必要字段进行统计
    const prompts = await prisma.prompt.findMany({
      select: {
        id: true,
        imageUrl: true,
        imageUrls: true,
        description: true,
        source: true,
        tags: { select: { id: true } },
        modelTags: { select: { id: true } },
        category: { select: { id: true } },
      },
    });

    const total = prompts.length;
    let noImage = 0;
    let nonR2Image = 0;
    let noTags = 0;
    let noModelTags = 0;
    let noDescription = 0;
    let noSource = 0;
    let noCategory = 0;
    let completeCount = 0;

    for (const prompt of prompts) {
      const imageUrl = prompt.imageUrl;
      const imageUrls = prompt.imageUrls as string[] | undefined;
      
      let hasAnyIssue = false;

      // 检查图片
      const hasImages = hasValidImages(imageUrl, imageUrls);
      const hasNonR2 = hasNonR2Images(imageUrl, imageUrls);
      
      if (!hasImages && !imageUrl && (!imageUrls || imageUrls.length === 0)) {
        noImage++;
        hasAnyIssue = true;
      }
      
      if (hasNonR2) {
        nonR2Image++;
        hasAnyIssue = true;
      }
      
      // 检查标签
      if (!prompt.tags || prompt.tags.length === 0) {
        noTags++;
        hasAnyIssue = true;
      }
      
      // 检查模型标签
      if (!prompt.modelTags || prompt.modelTags.length === 0) {
        noModelTags++;
        hasAnyIssue = true;
      }
      
      // 检查描述
      if (!prompt.description || prompt.description.trim() === '') {
        noDescription++;
        hasAnyIssue = true;
      }
      
      // 检查来源
      if (!prompt.source || prompt.source.trim() === '' || prompt.source === 'unknown') {
        noSource++;
        hasAnyIssue = true;
      }
      
      // 检查分类
      if (!prompt.category) {
        noCategory++;
        hasAnyIssue = true;
      }
      
      if (!hasAnyIssue) {
        completeCount++;
      }
    }

    const stats: MissingStats = {
      total,
      noImage,
      nonR2Image,
      noTags,
      noModelTags,
      noDescription,
      noSource,
      noCategory,
      completeCount,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching missing stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
