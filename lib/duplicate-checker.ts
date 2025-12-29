/**
 * Duplicate Checker Service
 * Provides comprehensive duplicate detection for prompts
 * 
 * v2.0: 优化性能 - 使用快速哈希预过滤 + 可选相似度检查
 */

import { promptRepository } from '@/repositories/prompt.repository';
import type { CreatePromptInput } from '@/types';
import { findMostSimilarPrompt, jaccardSimilarity, normalizeText } from './text-similarity';
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
  // 新增：快速模式 - 跳过耗时的相似度检查，只做精确匹配
  fastMode?: boolean;
  // 新增：采样检查 - 只检查部分数据库记录（提高性能）
  sampleSize?: number; // 0 = 全部检查, > 0 = 只检查最近N条
}

const DEFAULT_CONFIG: Required<DuplicateCheckConfig> = {
  checkImageUrl: true,
  checkSource: true,
  checkEffect: true,
  checkPromptSimilarity: true,
  similarityThreshold: 0.9,
  fastMode: false,
  sampleSize: 0, // 默认检查全部
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
 * 生成 prompt 的快速指纹（用于预过滤）
 * 使用前N个单词作为指纹，O(1)查找
 */
function generatePromptFingerprint(prompt: string, wordCount: number = 5): string {
  const normalized = normalizeText(prompt);
  const words = normalized.split(/\s+/).slice(0, wordCount);
  return words.join(' ');
}

/**
 * 快速 Jaccard 预过滤
 * 如果 Jaccard 相似度低于阈值的一半，则肯定不会超过完整相似度阈值
 */
function quickJaccardFilter(prompt1: string, prompt2: string, threshold: number): boolean {
  const jaccard = jaccardSimilarity(prompt1, prompt2);
  // Jaccard 占最终相似度的 40%，如果 Jaccard < threshold * 0.4，则不可能达到阈值
  return jaccard >= threshold * 0.3;
}

/**
 * Batch check duplicates for multiple prompts
 * Optimized for bulk import scenarios
 * 
 * v2.0 优化:
 * - 使用指纹预过滤减少相似度计算
 * - 支持采样检查（只检查最近N条）
 * - 支持快速模式（只检查来源URL）
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

  // ========== 快速模式：只检查来源URL ==========
  if (mergedConfig.fastMode) {
    // 只获取所有现有的 source URLs
    const allPrompts = await promptRepository.findAll();
    const existingSources = new Set<string>();
    for (const p of allPrompts) {
      if (p.source && p.source !== 'unknown' && p.source.trim() !== '') {
        existingSources.add(p.source);
      }
    }

    // 批次内去重
    const batchSources = new Set<string>();

    for (const item of items) {
      let result: DuplicateCheckResult = { isDuplicate: false };

      // 只检查有来源URL的数据
      if (item.source && item.source !== 'unknown' && item.source.trim() !== '') {
        // 检查数据库中是否存在
        if (existingSources.has(item.source)) {
          result = {
            isDuplicate: true,
            duplicateType: 'source',
            message: `已存在相同来源的提示词`,
          };
        }
        // 检查批次内是否重复
        else if (batchSources.has(item.source)) {
          result = {
            isDuplicate: true,
            duplicateType: 'source',
            message: `批量导入中存在重复来源`,
          };
        }
        
        // 如果不是重复，添加到批次追踪
        if (!result.isDuplicate) {
          batchSources.add(item.source);
        }
      }
      // 没有来源URL的数据直接放行
      
      results.push({ item, result });
    }

    return results;
  }

  // ========== 标准模式：完整去重检查 ==========
  const shouldCheckSimilarity = mergedConfig.checkPromptSimilarity;

  // Pre-fetch prompts for similarity checking (with optional sampling)
  let existingPrompts: Array<{ id: string; prompt: string }> = [];
  if (shouldCheckSimilarity) {
    const allPrompts = await promptRepository.findAllForSimilarityCheck();
    // 如果设置了采样大小，只检查最近的N条
    if (mergedConfig.sampleSize > 0 && allPrompts.length > mergedConfig.sampleSize) {
      existingPrompts = allPrompts.slice(-mergedConfig.sampleSize);
    } else {
      existingPrompts = allPrompts;
    }
  }

  // 为现有 prompts 建立指纹索引（用于快速预过滤）
  const existingFingerprints = new Map<string, Array<{ id: string; prompt: string }>>();
  for (const p of existingPrompts) {
    const fp = generatePromptFingerprint(p.prompt);
    if (!existingFingerprints.has(fp)) {
      existingFingerprints.set(fp, []);
    }
    existingFingerprints.get(fp)!.push(p);
  }

  // Also pre-fetch effects for batch effect checking
  const existingEffects = new Set<string>();
  const existingSources = new Set<string>();
  const existingImageUrls = new Set<string>();

  // Get all existing prompts for quick lookup (只获取必要字段)
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
  const batchFingerprints = new Map<string, Array<{ id: string; prompt: string }>>();

  for (const item of items) {
    let result: DuplicateCheckResult = { isDuplicate: false };

    // 1. Check imageUrl (O(1) - Set 查找)
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

    // 2. Check source (O(1) - Set 查找)
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

    // 3. Check effect (O(1) - Set 查找)
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

    // 4. Check prompt similarity (优化版：使用指纹预过滤 + 快速 Jaccard)
    if (!result.isDuplicate && shouldCheckSimilarity && item.prompt) {
      const itemFingerprint = generatePromptFingerprint(item.prompt);
      
      // 策略1: 先检查相同指纹的 prompts（最可能重复）
      const sameFingerprint = existingFingerprints.get(itemFingerprint) || [];
      for (const existing of sameFingerprint) {
        const similarResult = findMostSimilarPrompt(
          item.prompt,
          [existing],
          mergedConfig.similarityThreshold
        );
        if (similarResult) {
          result = {
            isDuplicate: true,
            duplicateType: 'prompt_similarity',
            existingPromptId: similarResult.id,
            similarityScore: similarResult.similarity,
            message: `存在相似度 ${(similarResult.similarity * 100).toFixed(1)}% 的提示词`,
          };
          break;
        }
      }

      // 策略2: 如果指纹没匹配，用快速 Jaccard 预过滤再做完整检查
      if (!result.isDuplicate) {
        // 限制检查数量，避免超时
        const maxCheck = Math.min(200, existingPrompts.length);
        const promptsToCheck = existingPrompts.slice(-maxCheck);
        
        // 使用 Jaccard 预过滤
        const candidates = promptsToCheck.filter(p => 
          quickJaccardFilter(item.prompt, p.prompt, mergedConfig.similarityThreshold)
        );
        
        if (candidates.length > 0) {
          const similarInDb = findMostSimilarPrompt(
            item.prompt,
            candidates,
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
          }
        }
      }

      // 策略3: 检查批次内部重复
      if (!result.isDuplicate && batchPrompts.length > 0) {
        const batchSameFingerprint = batchFingerprints.get(itemFingerprint) || [];
        const candidatesInBatch = batchSameFingerprint.length > 0 
          ? batchSameFingerprint 
          : batchPrompts.slice(-50).filter(p => 
              quickJaccardFilter(item.prompt, p.prompt, mergedConfig.similarityThreshold)
            );

        if (candidatesInBatch.length > 0) {
          const similarInBatch = findMostSimilarPrompt(
            item.prompt,
            candidatesInBatch,
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
    }

    // Add to batch tracking if not duplicate
    if (!result.isDuplicate) {
      if (item.effect) batchEffects.add(item.effect);
      if (item.source && item.source !== 'unknown') batchSources.add(item.source);
      
      const imageUrlToAdd = getPrimaryImageUrl(item.imageUrl, item.imageUrls);
      if (imageUrlToAdd) batchImageUrls.add(imageUrlToAdd);
      
      if (item.prompt) {
        const newPromptEntry = { id: `batch-${batchPrompts.length}`, prompt: item.prompt };
        batchPrompts.push(newPromptEntry);
        
        // 添加到批次指纹索引
        const fp = generatePromptFingerprint(item.prompt);
        if (!batchFingerprints.has(fp)) {
          batchFingerprints.set(fp, []);
        }
        batchFingerprints.get(fp)!.push(newPromptEntry);
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

