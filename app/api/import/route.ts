/**
 * Import API Route
 * POST /api/import - Import prompts from external data (requires authentication)
 * 
 * v2.0: 支持自动下载外部图片并上传到 R2 存储
 */

import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { promptRepository } from '@/repositories';
import prisma from '@/lib/db';
import { DEFAULT_CATEGORY } from '@/lib/constants';
import {
  successResponse,
  badRequestResponse,
  handleApiRoute,
} from '@/lib/api-utils';
import { filterDuplicates, DuplicateType } from '@/lib/duplicate-checker';
import { requireAuth } from '@/lib/security';
import { uploadImageFromUrl, isR2Configured, isR2ImageUrl } from '@/lib/r2';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

// Increase timeout for large imports (Vercel Pro: 最大 300 秒)
export const maxDuration = 300;

/**
 * 处理图片 URL - 如果是外部 URL，下载并上传到 R2
 * @param imageUrls - 图片 URL 数组
 * @param skipR2 - 是否跳过 R2 上传
 * @returns 处理后的图片 URL 数组和统计信息
 */
async function processImageUrls(
  imageUrls: string[],
  skipR2: boolean
): Promise<{ urls: string[]; uploaded: number; failed: number }> {
  if (!imageUrls || imageUrls.length === 0) {
    return { urls: [], uploaded: 0, failed: 0 };
  }

  // 如果跳过 R2 或 R2 未配置，直接返回原始 URL
  if (skipR2 || !isR2Configured()) {
    return { urls: imageUrls, uploaded: 0, failed: 0 };
  }

  const processedUrls: string[] = [];
  let uploaded = 0;
  let failed = 0;

  // 并行处理所有图片（限制并发数为 5）
  const CONCURRENCY = 5;
  for (let i = 0; i < imageUrls.length; i += CONCURRENCY) {
    const batch = imageUrls.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (url) => {
        // 如果已经是 R2 URL，直接返回
        if (isR2ImageUrl(url)) {
          return { url, uploaded: false };
        }

        // 如果是外部 URL，下载并上传到 R2
        if (url.startsWith('http://') || url.startsWith('https://')) {
          try {
            const result = await uploadImageFromUrl(url);
            if (result.success && result.url) {
              return { url: result.url, uploaded: true };
            } else {
              console.warn(`[Import] Failed to upload image: ${url} - ${result.error}`);
              // 上传失败时保留原始 URL
              return { url, uploaded: false, failed: true };
            }
          } catch (error) {
            console.warn(`[Import] Error uploading image: ${url}`, error);
            return { url, uploaded: false, failed: true };
          }
        }

        // 其他情况（相对路径等）保持原样
        return { url, uploaded: false };
      })
    );

    for (const result of results) {
      processedUrls.push(result.url);
      if (result.uploaded) uploaded++;
      if ((result as { failed?: boolean }).failed) failed++;
    }
  }

  return { urls: processedUrls, uploaded, failed };
}

// POST import prompts from external data (requires authentication)
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  return handleApiRoute(async () => {
    const body = await request.json();
    const { 
      items, 
      mode = 'merge',
      // 新增：快速模式 - 跳过耗时的相似度检查
      fastMode = false,
      // 新增：采样大小 - 只检查最近N条记录的相似度
      sampleSize = 200,
      // 新增：是否跳过 R2 上传（默认 false，即自动上传）
      skipR2 = false,
    } = body; // mode: 'merge' or 'replace'

    if (!Array.isArray(items) || items.length === 0) {
      return badRequestResponse('Invalid data format');
    }

    // 图片上传统计
    let imageUploadStats = { uploaded: 0, failed: 0 };

    // Transform and validate imported items
    // 统一字段映射规则：
    // - title/标题 → effect (标题) - 必填
    // - description/描述 → description (描述) - 可选
    // - prompt/提示词 → prompt (提示词) - 必填
    // - source/来源 → source (来源) - 可选
    // - tags/标签 → tags (标签数组) - 可选，支持多个标签
    // - imageUrl/图片 → imageUrl (主图片) - 可选
    // - imageUrls/图片列表 → imageUrls (图片数组) - 可选，支持多个图片
    // - modelTags/模型标签 → modelTags (默认: ['Banana'])
    // - category/生成类型 → category (默认: '文生图')
    
    // 第一步：解析所有数据字段
    const parsedItems = items.map((item: Record<string, unknown>) => {
      // 标题字段映射 (title/标题 → effect)
      const effect = (item.title || item.标题 || item.effect || item.效果 || '') as string;
      
      // 描述字段映射 (description/描述)
      const description = (item.description || item.描述 || item.desc || '') as string;
      
      // 提示词字段映射 (prompt/提示词)
      const prompt = (item.prompt || item.提示词 || item.content || '') as string;
      
      // 来源字段映射 (source/来源)
      const source = (item.source || item.来源 || item.提示词来源 || item.link || '') as string;
      
      // 标签字段映射 (tags/标签)
      const tags = item.tags || item.标签 || item.评测对象 || item.场景标签 || [];
      
      // 模型标签字段映射 (modelTags/模型标签)
      const modelTags = item.modelTags || item.模型标签 || item.AI模型 || item.模型 || [];
      
      // 图片字段映射 - 支持多个图片
      // imageUrl/图片 可以是单个字符串或数组
      // imageUrls/图片列表 是图片数组
      const rawImageUrl = item.imageUrl || item.图片 || item.image || item.preview || '';
      const rawImageUrls = item.imageUrls || item.图片列表 || [];
      
      // 收集所有图片到 imageUrls 数组
      let imageUrls: string[] = [];
      
      // 1. 先处理 imageUrls 字段（可能是数组或嵌套数组）
      if (Array.isArray(rawImageUrls)) {
        imageUrls = rawImageUrls.flat().filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
      }
      
      // 2. 处理 imageUrl 字段（可能是字符串或数组）
      if (Array.isArray(rawImageUrl)) {
        // 如果 imageUrl 是数组，合并到 imageUrls
        const urlsFromImageUrl = rawImageUrl.filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
        imageUrls = [...new Set([...imageUrls, ...urlsFromImageUrl])]; // 去重
      } else if (typeof rawImageUrl === 'string' && rawImageUrl.trim()) {
        // 如果 imageUrl 是字符串，添加到数组开头（作为主图片）
        if (!imageUrls.includes(rawImageUrl.trim())) {
          imageUrls.unshift(rawImageUrl.trim());
        }
      }
      
      // 生成类型字段映射 (category/生成类型) - 默认为 '文生图'
      // Handle category - could be string or array
      const rawCategory = item.category || item.生成类型 || item.类别 || item.分类 || '';
      const category = Array.isArray(rawCategory)
        ? (rawCategory[0] || '') as string
        : rawCategory as string;

      // Parse tags if it's a string
      let parsedTags = tags;
      if (typeof tags === 'string') {
        parsedTags = tags
          .split(/[,，、]/)
          .map((t: string) => t.trim())
          .filter((t: string) => t);
      }

      // Parse modelTags if it's a string
      let parsedModelTags = modelTags;
      if (typeof modelTags === 'string') {
        parsedModelTags = modelTags
          .split(/[,，、]/)
          .map((t: string) => t.trim())
          .filter((t: string) => t);
      }
      
      // 确保 modelTags 是数组，如果为空则默认设置为 ['Banana']
      const finalModelTags = Array.isArray(parsedModelTags) ? parsedModelTags : [];
      const modelTagsWithDefault = finalModelTags.length > 0 ? finalModelTags : ['Banana'];
      
      // 确保 category 有值，如果为空则默认设置为 '文生图'
      const categoryWithDefault = category.trim() || DEFAULT_CATEGORY;

      return {
        effect,
        description: description || '',
        tags: Array.isArray(parsedTags) ? parsedTags : [],
        modelTags: modelTagsWithDefault,
        prompt,
        source: source || 'unknown',
        imageUrls, // 先保存原始 URL，后面会处理
        category: categoryWithDefault,
      };
    });

    // 第二步：处理图片上传到 R2（如果启用）
    console.log(`[Import] Processing images for ${parsedItems.length} items, skipR2=${skipR2}, r2Configured=${isR2Configured()}`);
    
    const newPrompts = await Promise.all(
      parsedItems.map(async (item) => {
        // 处理图片 URL - 下载外部图片并上传到 R2
        const imageResult = await processImageUrls(item.imageUrls, skipR2);
        
        // 累加统计
        imageUploadStats.uploaded += imageResult.uploaded;
        imageUploadStats.failed += imageResult.failed;

        // 主图片是处理后的第一个 URL
        const imageUrl = imageResult.urls[0] || '';
        const imageUrls = imageResult.urls;

        return {
          ...item,
          imageUrl: imageUrl || undefined,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        };
      })
    );
    
    console.log(`[Import] Image processing complete: ${imageUploadStats.uploaded} uploaded, ${imageUploadStats.failed} failed`);

    // Validate required fields - only effect and prompt are required
    // v2.1: 改为过滤无效数据，而不是拒绝整个批次
    const validPrompts = newPrompts.filter((item) => item.effect && item.prompt);
    const invalidItems = newPrompts.filter((item) => !item.effect || !item.prompt);

    // 记录无效数据统计（但不拒绝整个批次）
    let invalidStats = {
      total: invalidItems.length,
      missingEffect: newPrompts.filter((item) => !item.effect).length,
      missingPrompt: newPrompts.filter((item) => !item.prompt).length,
    };

    if (invalidItems.length > 0) {
      // 只记录日志，不拒绝批次
      const sampleInvalid = invalidItems.slice(0, 3).map((item, i) => ({
        index: i,
        hasEffect: !!item.effect,
        hasPrompt: !!item.prompt,
        effectPreview: item.effect ? item.effect.substring(0, 30) : '(空)',
        promptPreview: item.prompt ? item.prompt.substring(0, 30) : '(空)',
      }));
      
      console.warn('[Import] Filtered invalid items:', {
        total: invalidItems.length,
        missingEffect: invalidStats.missingEffect,
        missingPrompt: invalidStats.missingPrompt,
        validCount: validPrompts.length,
        sampleInvalid,
      });
    }

    // 如果没有有效数据，才返回错误
    if (validPrompts.length === 0) {
      return badRequestResponse(
        `所有 ${invalidItems.length} 条数据都缺少必需字段。缺少effect(标题): ${invalidStats.missingEffect}条，缺少prompt(提示词): ${invalidStats.missingPrompt}条。`
      );
    }

    let importedCount = 0;
    let failedCount = 0;
    let duplicateStats: Record<DuplicateType, number> | undefined;
    let failedItems: Array<{ index: number; effect: string; error: string }> | undefined;
    const submittedCount = newPrompts.length; // 本批次提交的总数（包含无效数据）
    const filteredInvalidCount = invalidItems.length; // 被过滤的无效数据数量

    if (mode === 'replace') {
      // Delete all existing data first
      await prisma.prompt.deleteMany();
      // Also clean up orphaned tags
      await prisma.tag.deleteMany({ where: { prompts: { none: {} } } });
      
      // For replace mode, we still want to avoid internal batch duplicates
      // Use a simple effect-based dedup within the batch (faster than full similarity check)
      const seenEffects = new Set<string>();
      const seenImageUrls = new Set<string>();
      const seenSources = new Set<string>();
      
      // v2.1: 使用 validPrompts（已过滤无效数据）
      const uniqueInBatch = validPrompts.filter((p) => {
        // Check effect
        if (seenEffects.has(p.effect)) return false;
        seenEffects.add(p.effect);
        
        // Check imageUrl
        if (p.imageUrl && seenImageUrls.has(p.imageUrl)) return false;
        if (p.imageUrl) seenImageUrls.add(p.imageUrl);
        
        // Check source (skip 'unknown')
        if (p.source && p.source !== 'unknown' && seenSources.has(p.source)) return false;
        if (p.source && p.source !== 'unknown') seenSources.add(p.source);
        
        return true;
      });
      
      const result = await promptRepository.bulkCreate(uniqueInBatch);
      importedCount = result.success;
      failedCount = result.failed;
      failedItems = result.failedItems;
      
      const totalDuplicates = validPrompts.length - uniqueInBatch.length;
      if (totalDuplicates > 0) {
        duplicateStats = {
          imageUrl: 0,
          source: 0,
          effect: totalDuplicates, // Simplified - count all as effect duplicates
          prompt_similarity: 0,
        };
      }
    } else {
      // Merge with existing data - full duplicate detection
      // Checks: imageUrl, source, effect (exact match), prompt similarity (>90%)
      // v2.0: 支持快速模式和采样检查
      // v2.1: 使用 validPrompts（已过滤无效数据）
      const { uniqueItems, stats } = await filterDuplicates(validPrompts, {
        checkImageUrl: true,
        checkSource: true,
        checkEffect: true,
        checkPromptSimilarity: !fastMode, // 快速模式跳过相似度检查
        similarityThreshold: 0.9,
        fastMode: fastMode,
        sampleSize: sampleSize, // 只检查最近N条记录
      });

      const result = await promptRepository.bulkCreate(uniqueItems);
      importedCount = result.success;
      failedCount = result.failed;
      failedItems = result.failedItems;
      duplicateStats = stats.duplicatesByType;
    }

    const totalCount = await promptRepository.count();
    const skippedCount = duplicateStats ? Object.values(duplicateStats).reduce((a, b) => a + b, 0) : 0;

    // 自动刷新前端页面缓存，使新导入的数据立即可见
    try {
      revalidatePath('/zh', 'page');
      revalidatePath('/en', 'page');
      revalidatePath('/', 'page');
      console.log('[Import] Cache revalidated for home pages');
      
      // 主动预热缓存：触发页面重新生成（异步执行，不阻塞响应）
      // 这确保下一个用户访问时能看到最新数据
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      
      // 异步预热，不等待结果
      Promise.all([
        fetch(`${baseUrl}/zh`, { cache: 'no-store' }).catch(() => {}),
        fetch(`${baseUrl}/en`, { cache: 'no-store' }).catch(() => {}),
      ]).then(() => {
        console.log('[Import] Cache warmed up for home pages');
      }).catch(() => {
        // 忽略预热失败
      });
    } catch (revalidateError) {
      console.warn('[Import] Cache revalidation failed:', revalidateError);
      // 不影响导入结果，只是缓存刷新失败
    }

    // 汇总失败原因
    let failedSummary: Record<string, number> | undefined;
    if (failedItems && failedItems.length > 0) {
      failedSummary = {};
      for (const item of failedItems) {
        const errorType = item.error.includes(':') 
          ? item.error.split(':')[0] 
          : item.error.substring(0, 30);
        failedSummary[errorType] = (failedSummary[errorType] || 0) + 1;
      }
    }

    return successResponse({
      submitted: submittedCount,     // 本批次提交的总数（包含无效数据）
      imported: importedCount,       // 成功导入的数量
      skipped: skippedCount,         // 因重复跳过的数量
      failed: failedCount,           // 导入失败的数量（数据库错误等）
      filtered: filteredInvalidCount,// 因缺少必需字段被过滤的数量
      total: totalCount,             // 数据库中的总数
      mode,
      // 新增：图片上传统计
      imageUpload: {
        uploaded: imageUploadStats.uploaded,    // 成功上传到 R2 的图片数
        failed: imageUploadStats.failed,        // 上传失败的图片数
        r2Configured: isR2Configured(),         // R2 是否已配置
        skipR2,                                 // 是否跳过 R2 上传
      },
      duplicatesFiltered: duplicateStats ? {
        byImageUrl: duplicateStats.imageUrl,
        bySource: duplicateStats.source,
        byEffect: duplicateStats.effect,
        byPromptSimilarity: duplicateStats.prompt_similarity,
        total: skippedCount,
      } : undefined,
      // 无效数据统计（缺少必需字段）
      invalidFiltered: filteredInvalidCount > 0 ? {
        total: filteredInvalidCount,
        missingEffect: invalidStats.missingEffect,
        missingPrompt: invalidStats.missingPrompt,
      } : undefined,
      // 新增：失败详情
      failedDetails: failedCount > 0 ? {
        summary: failedSummary,                    // 按错误类型汇总
        samples: failedItems?.slice(0, 10),        // 最多返回10条失败样本
        totalFailed: failedCount,
      } : undefined,
    });
  });
}
