/**
 * Import API Route
 * POST /api/import - Import prompts from external data
 */

import { NextRequest } from 'next/server';
import { promptRepository } from '@/repositories';
import prisma from '@/lib/db';
import { DEFAULT_CATEGORY } from '@/lib/constants';
import {
  successResponse,
  badRequestResponse,
  handleApiRoute,
} from '@/lib/api-utils';
import { filterDuplicates, DuplicateType } from '@/lib/duplicate-checker';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

// POST import prompts from external data
export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const { items, mode = 'merge' } = body; // mode: 'merge' or 'replace'

    if (!Array.isArray(items) || items.length === 0) {
      return badRequestResponse('Invalid data format');
    }

    // Transform and validate imported items
    const newPrompts = items.map((item: Record<string, unknown>) => {
      // Flexible field mapping
      const effect = (item.effect || item.效果 || item.title || '') as string;
      const description = (item.description || item.描述 || item.desc || item.title || '') as string;
      const prompt = (item.prompt || item.提示词 || item.content || '') as string;
      const source = (item.source || item.来源 || item.提示词来源 || item.link || '') as string;
      const tags = item.tags || item.标签 || item.评测对象 || item.场景标签 || [];
      const modelTags = item.modelTags || item.AI模型 || item.模型标签 || item.模型 || [];
      const imageUrl = (item.imageUrl || item.图片 || item.image || item.preview || '') as string;
      // Category field mapping - defaults to '文生图'
      const category = (item.category || item.类别 || item.分类 || item.生成类型 || DEFAULT_CATEGORY) as string;

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

      return {
        effect,
        description: description || '',
        tags: Array.isArray(parsedTags) ? parsedTags : [],
        modelTags: Array.isArray(parsedModelTags) ? parsedModelTags : [],
        prompt,
        source: source || 'unknown',
        imageUrl: imageUrl || undefined,
        category,
      };
    });

    // Validate required fields - only effect and prompt are required
    const invalidItems = newPrompts.filter((item) => !item.effect || !item.prompt);

    if (invalidItems.length > 0) {
      return badRequestResponse(
        `${invalidItems.length} items missing required fields (effect, prompt)`
      );
    }

    let importedCount = 0;
    let duplicateStats: Record<DuplicateType, number> | undefined;

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
      const { uniqueItems, stats } = await filterDuplicates(newPrompts, {
        checkImageUrl: true,
        checkSource: true,
        checkEffect: true,
        checkPromptSimilarity: true,
        similarityThreshold: 0.9,
      });

      const result = await promptRepository.bulkCreate(uniqueItems);
      importedCount = result.success;
      duplicateStats = stats.duplicatesByType;
    }

    const totalCount = await promptRepository.count();

    return successResponse({
      imported: importedCount,
      total: totalCount,
      mode,
      duplicatesFiltered: duplicateStats ? {
        byImageUrl: duplicateStats.imageUrl,
        bySource: duplicateStats.source,
        byEffect: duplicateStats.effect,
        byPromptSimilarity: duplicateStats.prompt_similarity,
        total: Object.values(duplicateStats).reduce((a, b) => a + b, 0),
      } : undefined,
    });
  });
}
