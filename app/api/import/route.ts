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

    if (mode === 'replace') {
      // Delete all existing data first
      await prisma.prompt.deleteMany();
      // Also clean up orphaned tags
      await prisma.tag.deleteMany({ where: { prompts: { none: {} } } });
      // Import new data using repository
      const result = await promptRepository.bulkCreate(newPrompts);
      importedCount = result.success;
    } else {
      // Merge with existing data (avoid duplicates by checking effect)
      const existingPrompts = await promptRepository.findAll();
      const existingEffects = new Set(existingPrompts.map((p) => p.effect));
      const uniqueNewPrompts = newPrompts.filter((p) => !existingEffects.has(p.effect));
      const result = await promptRepository.bulkCreate(uniqueNewPrompts);
      importedCount = result.success;
    }

    const totalCount = await promptRepository.count();

    return successResponse({
      imported: importedCount,
      total: totalCount,
      mode,
    });
  });
}
