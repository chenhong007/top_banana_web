/**
 * Import API Route
 * POST /api/import - Import prompts from external data (requires authentication)
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

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

// Increase timeout for large imports (Vercel Pro: 最大 300 秒)
export const maxDuration = 300;

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
    } = body; // mode: 'merge' or 'replace'

    if (!Array.isArray(items) || items.length === 0) {
      return badRequestResponse('Invalid data format');
    }

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
    const newPrompts = items.map((item: Record<string, unknown>) => {
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
      
      // 主图片是 imageUrls 的第一个
      const imageUrl = imageUrls[0] || '';
      
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
        imageUrl: imageUrl || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        category: categoryWithDefault,
      };
    });

    // Validate required fields - only effect and prompt are required
    const invalidItems = newPrompts.filter((item) => !item.effect || !item.prompt);

    if (invalidItems.length > 0) {
      // 提供更详细的错误信息，帮助调试
      const missingEffect = newPrompts.filter((item) => !item.effect).length;
      const missingPrompt = newPrompts.filter((item) => !item.prompt).length;
      const sampleInvalid = invalidItems.slice(0, 3).map((item, i) => ({
        index: i,
        hasEffect: !!item.effect,
        hasPrompt: !!item.prompt,
        effectPreview: item.effect ? item.effect.substring(0, 30) : '(空)',
        promptPreview: item.prompt ? item.prompt.substring(0, 30) : '(空)',
      }));
      
      console.error('[Import] Invalid items detected:', {
        total: invalidItems.length,
        missingEffect,
        missingPrompt,
        sampleInvalid,
      });
      
      return badRequestResponse(
        `${invalidItems.length} 条数据缺少必需字段。缺少effect(标题): ${missingEffect}条，缺少prompt(提示词): ${missingPrompt}条。示例: ${JSON.stringify(sampleInvalid)}`
      );
    }

    let importedCount = 0;
    let failedCount = 0;
    let duplicateStats: Record<DuplicateType, number> | undefined;
    let failedItems: Array<{ index: number; effect: string; error: string }> | undefined;
    const submittedCount = newPrompts.length; // 本批次提交的总数

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
      
      const uniqueInBatch = newPrompts.filter((p) => {
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
      
      const totalDuplicates = newPrompts.length - uniqueInBatch.length;
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
      const { uniqueItems, stats } = await filterDuplicates(newPrompts, {
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
      submitted: submittedCount,     // 本批次提交的总数
      imported: importedCount,       // 成功导入的数量
      skipped: skippedCount,         // 因重复跳过的数量
      failed: failedCount,           // 导入失败的数量（数据库错误等）
      total: totalCount,             // 数据库中的总数
      mode,
      duplicatesFiltered: duplicateStats ? {
        byImageUrl: duplicateStats.imageUrl,
        bySource: duplicateStats.source,
        byEffect: duplicateStats.effect,
        byPromptSimilarity: duplicateStats.prompt_similarity,
        total: skippedCount,
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
