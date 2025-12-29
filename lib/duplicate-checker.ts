/**
 * Duplicate Checker Service
 * Provides comprehensive duplicate detection for prompts
 */

import { promptRepository } from '@/repositories/prompt.repository';
import type { CreatePromptInput } from '@/types';
import { findMostSimilarPrompt } from './text-similarity';
import { getPrimaryImageUrl } from './image-utils';

/**
 * Types of duplicates that can be detected
 */
export type DuplicateType = 'imageUrl' | 'source' | 'effect' | 'prompt_similarity';

/**
 * Result of a duplicate check
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType?: DuplicateType;
  existingPromptId?: string;
  existingPromptEffect?: string;
  similarityScore?: number;
  message?: string;
}

/**
 * Configuration for duplicate checking
 */
export interface DuplicateCheckConfig {
  checkImageUrl?: boolean;
  checkSource?: boolean;
  checkEffect?: boolean;
  checkPromptSimilarity?: boolean;
  similarityThreshold?: number; // Default 0.9 (90%)
}

const DEFAULT_CONFIG: Required<DuplicateCheckConfig> = {
  checkImageUrl: true,
  checkSource: true,
  checkEffect: true,
  checkPromptSimilarity: true,
  similarityThreshold: 0.9,
};

/**
 * Check if a prompt is a duplicate based on multiple criteria
 * Checks in order: imageUrl -> source -> effect -> prompt similarity
 * 
 * @param data The prompt data to check
 * @param config Optional configuration to customize which checks to perform
 * @returns DuplicateCheckResult indicating if duplicate was found and details
 */
export async function checkDuplicate(
  data: CreatePromptInput,
  config: DuplicateCheckConfig = {}
): Promise<DuplicateCheckResult> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // 1. Check imageUrl (primary image)
  if (mergedConfig.checkImageUrl) {
    const imageUrlToCheck = getPrimaryImageUrl(data.imageUrl, data.imageUrls);
    
    if (imageUrlToCheck) {
      const existingByImage = await promptRepository.findByImageUrl(imageUrlToCheck);
      if (existingByImage) {
        return {
          isDuplicate: true,
          duplicateType: 'imageUrl',
          existingPromptId: existingByImage.id,
          existingPromptEffect: existingByImage.effect,
          message: `已存在相同图片URL的提示词: "${existingByImage.effect}"`,
        };
      }
    }
  }

  // 2. Check source URL
  if (mergedConfig.checkSource && data.source && data.source !== 'unknown') {
    const existingBySource = await promptRepository.findBySource(data.source);
    if (existingBySource) {
      return {
        isDuplicate: true,
        duplicateType: 'source',
        existingPromptId: existingBySource.id,
        existingPromptEffect: existingBySource.effect,
        message: `已存在相同来源的提示词: "${existingBySource.effect}"`,
      };
    }
  }

  // 3. Check exact effect (title) match
  if (mergedConfig.checkEffect && data.effect) {
    const existingByEffect = await promptRepository.findByEffect(data.effect);
    if (existingByEffect) {
      return {
        isDuplicate: true,
        duplicateType: 'effect',
        existingPromptId: existingByEffect.id,
        existingPromptEffect: existingByEffect.effect,
        message: `已存在相同标题的提示词: "${existingByEffect.effect}"`,
      };
    }
  }

  // 4. Check prompt content similarity
  if (mergedConfig.checkPromptSimilarity && data.prompt) {
    const existingPrompts = await promptRepository.findAllForSimilarityCheck();
    
    if (existingPrompts.length > 0) {
      const similarPrompt = findMostSimilarPrompt(
        data.prompt,
        existingPrompts,
        mergedConfig.similarityThreshold
      );

      if (similarPrompt) {
        return {
          isDuplicate: true,
          duplicateType: 'prompt_similarity',
          existingPromptId: similarPrompt.id,
          similarityScore: similarPrompt.similarity,
          message: `存在相似度 ${(similarPrompt.similarity * 100).toFixed(1)}% 的提示词`,
        };
      }
    }
  }

  // No duplicate found
  return {
    isDuplicate: false,
  };
}

/**
 * Batch check duplicates for multiple prompts
 * Optimized for bulk import scenarios
 * 
 * @param items Array of prompt data to check
 * @param config Optional configuration
 * @returns Array of results with duplicate info for each item
 */
export async function checkDuplicatesBatch(
  items: CreatePromptInput[],
  config: DuplicateCheckConfig = {}
): Promise<Array<{ item: CreatePromptInput; result: DuplicateCheckResult }>> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const results: Array<{ item: CreatePromptInput; result: DuplicateCheckResult }> = [];

  // Pre-fetch all prompts for similarity checking (one DB call instead of N)
  const existingPrompts = mergedConfig.checkPromptSimilarity 
    ? await promptRepository.findAllForSimilarityCheck()
    : [];

  // Also pre-fetch effects for batch effect checking
  const existingEffects = new Set<string>();
  const existingSources = new Set<string>();
  const existingImageUrls = new Set<string>();

  // Get all existing prompts for quick lookup
  const allPrompts = await promptRepository.findAll();
  for (const p of allPrompts) {
    if (p.effect) existingEffects.add(p.effect);
    if (p.source && p.source !== 'unknown') existingSources.add(p.source);
    if (p.imageUrl) existingImageUrls.add(p.imageUrl);
    if (p.imageUrls) {
      for (const url of p.imageUrls) {
        existingImageUrls.add(url);
      }
    }
  }

  // Track new items being added in this batch to avoid internal duplicates
  const batchEffects = new Set<string>();
  const batchSources = new Set<string>();
  const batchImageUrls = new Set<string>();
  const batchPrompts: Array<{ id: string; prompt: string }> = [];

  for (const item of items) {
    let result: DuplicateCheckResult = { isDuplicate: false };

    // 1. Check imageUrl
    if (mergedConfig.checkImageUrl) {
      const imageUrlToCheck = getPrimaryImageUrl(item.imageUrl, item.imageUrls);
      
      if (imageUrlToCheck) {
        // Check against existing DB
        if (existingImageUrls.has(imageUrlToCheck)) {
          result = {
            isDuplicate: true,
            duplicateType: 'imageUrl',
            message: `已存在相同图片URL的提示词`,
          };
        }
        // Check against batch
        else if (batchImageUrls.has(imageUrlToCheck)) {
          result = {
            isDuplicate: true,
            duplicateType: 'imageUrl',
            message: `批量导入中存在重复图片URL`,
          };
        }
      }
    }

    // 2. Check source (only if not already marked as duplicate)
    if (!result.isDuplicate && mergedConfig.checkSource && item.source && item.source !== 'unknown') {
      if (existingSources.has(item.source)) {
        result = {
          isDuplicate: true,
          duplicateType: 'source',
          message: `已存在相同来源的提示词`,
        };
      } else if (batchSources.has(item.source)) {
        result = {
          isDuplicate: true,
          duplicateType: 'source',
          message: `批量导入中存在重复来源`,
        };
      }
    }

    // 3. Check effect
    if (!result.isDuplicate && mergedConfig.checkEffect && item.effect) {
      if (existingEffects.has(item.effect)) {
        result = {
          isDuplicate: true,
          duplicateType: 'effect',
          message: `已存在相同标题的提示词: "${item.effect}"`,
        };
      } else if (batchEffects.has(item.effect)) {
        result = {
          isDuplicate: true,
          duplicateType: 'effect',
          message: `批量导入中存在重复标题: "${item.effect}"`,
        };
      }
    }

    // 4. Check prompt similarity
    if (!result.isDuplicate && mergedConfig.checkPromptSimilarity && item.prompt) {
      // Check against existing prompts
      const similarInDb = findMostSimilarPrompt(
        item.prompt,
        existingPrompts,
        mergedConfig.similarityThreshold
      );

      if (similarInDb) {
        result = {
          isDuplicate: true,
          duplicateType: 'prompt_similarity',
          existingPromptId: similarInDb.id,
          similarityScore: similarInDb.similarity,
          message: `存在相似度 ${(similarInDb.similarity * 100).toFixed(1)}% 的提示词`,
        };
      } else {
        // Check against batch prompts
        const similarInBatch = findMostSimilarPrompt(
          item.prompt,
          batchPrompts,
          mergedConfig.similarityThreshold
        );

        if (similarInBatch) {
          result = {
            isDuplicate: true,
            duplicateType: 'prompt_similarity',
            similarityScore: similarInBatch.similarity,
            message: `批量导入中存在相似度 ${(similarInBatch.similarity * 100).toFixed(1)}% 的提示词`,
          };
        }
      }
    }

    // Add to batch tracking if not duplicate
    if (!result.isDuplicate) {
      if (item.effect) batchEffects.add(item.effect);
      if (item.source && item.source !== 'unknown') batchSources.add(item.source);
      
      const imageUrlToAdd = getPrimaryImageUrl(item.imageUrl, item.imageUrls);
      if (imageUrlToAdd) batchImageUrls.add(imageUrlToAdd);
      
      if (item.prompt) {
        batchPrompts.push({ id: `batch-${batchPrompts.length}`, prompt: item.prompt });
      }
    }

    results.push({ item, result });
  }

  return results;
}

/**
 * Filter out duplicates from a batch of prompts
 * Returns only the unique prompts that should be imported
 * 
 * @param items Array of prompt data to filter
 * @param config Optional configuration
 * @returns Object with unique items and duplicate info
 */
export async function filterDuplicates(
  items: CreatePromptInput[],
  config: DuplicateCheckConfig = {}
): Promise<{
  uniqueItems: CreatePromptInput[];
  duplicates: Array<{ item: CreatePromptInput; reason: DuplicateCheckResult }>;
  stats: {
    total: number;
    unique: number;
    duplicatesByType: Record<DuplicateType, number>;
  };
}> {
  const batchResults = await checkDuplicatesBatch(items, config);

  const uniqueItems: CreatePromptInput[] = [];
  const duplicates: Array<{ item: CreatePromptInput; reason: DuplicateCheckResult }> = [];
  const duplicatesByType: Record<DuplicateType, number> = {
    imageUrl: 0,
    source: 0,
    effect: 0,
    prompt_similarity: 0,
  };

  for (const { item, result } of batchResults) {
    if (result.isDuplicate) {
      duplicates.push({ item, reason: result });
      if (result.duplicateType) {
        duplicatesByType[result.duplicateType]++;
      }
    } else {
      uniqueItems.push(item);
    }
  }

  return {
    uniqueItems,
    duplicates,
    stats: {
      total: items.length,
      unique: uniqueItems.length,
      duplicatesByType,
    },
  };
}

