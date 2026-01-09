/**
 * Prompts Data Import API Route
 * POST /api/import/prompts-data - Import data from prompts_data.json to database
 * 
 * Usage:
 * curl -X POST https://your-domain.com/api/import/prompts-data \
 *   -H "Content-Type: application/json" \
 *   -d '{"secret": "YOUR_SECRET", "skipR2": true, "limit": 10}'
 * 
 * Field mapping:
 * - title → effect
 * - prompt → prompt
 * - description → description
 * - source → source
 * - tags → tags
 * - imageUrl → imageUrl
 * - imageUrls → imageUrls
 * - updateDate → createdAt
 * - category → "文生图" (default)
 * - modelTags → ["banana"] (default)
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { uploadImageFromUrl, isR2Configured, isR2ImageUrl } from '@/lib/r2';
import { checkPromptSimilarity } from '@/lib/text-similarity';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const revalidate = 0;

const API_VERSION = 'v1.0';
const SIMILARITY_THRESHOLD = 0.9;
const DEFAULT_MODEL_TAG = 'banana';
const DEFAULT_CATEGORY = '文生图';
const MAX_TAGS = 3;

// Type definition for prompts_data.json
interface PromptsDataItem {
  title: string;
  prompt: string;
  description?: string;
  source?: string;
  tags?: string[];
  imageUrl?: string;
  imageUrls?: string[];
  updateDate?: string; // ISO date string like "2025-11-21"
}

interface PromptsDataFile {
  prompts: PromptsDataItem[];
}

interface ImportStats {
  total: number;
  processed: number;
  success: number;
  skippedByUrl: number;
  skippedBySimilarity: number;
  imageUploadSuccess: number;
  imageUploadFailed: number;
  errors: string[];
}

/**
 * Load prompts_data.json dynamically
 */
function loadPromptsData(): PromptsDataFile {
  const jsonPath = path.join(process.cwd(), 'data', 'prompts_data.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(rawData);
}

/**
 * Verify authentication
 */
function verifyAuth(request: NextRequest, body?: Record<string, unknown>): { success: boolean; error?: string } {
  const importSecret = process.env.IMPORT_SECRET;
  
  if (!importSecret) {
    return { success: false, error: 'Server IMPORT_SECRET not configured' };
  }
  
  let token = request.headers.get('Authorization')?.replace('Bearer ', '') || 
              request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token && body?.secret && typeof body.secret === 'string') {
    token = body.secret;
  }

  if (!token) {
    return { success: false, error: 'Missing Authorization header or secret parameter' };
  }
  
  if (token !== importSecret) {
    return { success: false, error: 'Invalid token' };
  }

  return { success: true };
}

/**
 * Get existing source URLs
 */
async function getExistingSources(): Promise<Set<string>> {
  const prompts = await prisma.prompt.findMany({
    select: { source: true },
  });
  return new Set(prompts.map(p => p.source).filter(s => s && s !== 'unknown'));
}

/**
 * Get existing prompts for similarity check
 */
async function getExistingPrompts(): Promise<Array<{ id: string; prompt: string }>> {
  return await prisma.prompt.findMany({
    select: { id: true, prompt: true },
  });
}

/**
 * Get existing tags
 */
async function getExistingTags(): Promise<Map<string, string>> {
  const tags = await prisma.tag.findMany({
    select: { name: true },
  });
  const tagMap = new Map<string, string>();
  for (const tag of tags) {
    tagMap.set(tag.name.toLowerCase(), tag.name);
  }
  return tagMap;
}

/**
 * Match tags intelligently
 */
function matchTags(itemTags: string[], existingTags: Map<string, string>): string[] {
  const result: string[] = [];
  const tagsToProcess = itemTags.slice(0, MAX_TAGS);
  
  for (const tag of tagsToProcess) {
    const lowerTag = tag.toLowerCase();
    if (existingTags.has(lowerTag)) {
      result.push(existingTags.get(lowerTag)!);
    } else {
      result.push(tag);
    }
  }
  
  return result;
}

/**
 * Check similarity (optimized)
 */
function checkSimilarity(
  promptText: string,
  existingPrompts: Array<{ id: string; prompt: string }>
): { isSimilar: boolean; similarity: number } {
  const maxCheck = Math.min(100, existingPrompts.length);
  const promptsToCheck = existingPrompts.slice(-maxCheck);
  
  for (const existing of promptsToCheck) {
    const result = checkPromptSimilarity(promptText, existing.prompt, SIMILARITY_THRESHOLD);
    if (result.isSimilar) {
      return { isSimilar: true, similarity: result.similarity };
    }
  }
  return { isSimilar: false, similarity: 0 };
}

/**
 * Process images
 */
async function processImages(
  imageUrls: string[],
  skipR2: boolean
): Promise<{ urls: string[]; successCount: number; failedCount: number }> {
  const urls: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  if (!imageUrls || imageUrls.length === 0) {
    return { urls: [], successCount: 0, failedCount: 0 };
  }

  // Skip R2 upload if requested or not configured
  if (skipR2 || !isR2Configured()) {
    return { urls: imageUrls, successCount: 0, failedCount: 0 };
  }

  // Parallel upload with concurrency limit
  const CONCURRENCY = 5;
  for (let i = 0; i < imageUrls.length; i += CONCURRENCY) {
    const batch = imageUrls.slice(i, i + CONCURRENCY);
    const uploadPromises = batch.map(async (url) => {
      // Already R2 URL, skip
      if (isR2ImageUrl(url)) {
        return { url, success: false, skipped: true };
      }

      try {
        const result = await uploadImageFromUrl(url);
        if (result.success && result.url) {
          return { url: result.url, success: true };
        } else {
          console.warn(`[Prompts Data Import] Failed to upload image: ${url}`);
          return { url, success: false };
        }
      } catch (error) {
        console.warn(`[Prompts Data Import] Error uploading image: ${url}`, error);
        return { url, success: false };
      }
    });

    const results = await Promise.all(uploadPromises);
  
    for (const result of results) {
      urls.push(result.url);
      if (result.success) {
        successCount++;
      } else if (!(result as { skipped?: boolean }).skipped) {
        failedCount++;
      }
    }
  }

  return { urls, successCount, failedCount };
}

/**
 * Parse updateDate to Date object
 */
function parseUpdateDate(updateDate?: string): Date {
  if (!updateDate) {
    return new Date();
  }
  
  // Support formats: "2025-11-21", "2025/11/21", etc.
  const date = new Date(updateDate);
  return isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Create single prompt record
 */
async function createPrompt(
  item: PromptsDataItem,
  imageUrls: string[],
  tags: string[]
): Promise<void> {
  const createdAt = parseUpdateDate(item.updateDate);

  await prisma.prompt.create({
    data: {
      effect: item.title,
      description: item.description || '',
      prompt: item.prompt,
      source: item.source || 'unknown',
      imageUrl: imageUrls[0] || null,
      imageUrls: imageUrls,
      tags: {
        connectOrCreate: tags.map((name) => ({
          where: { name },
          create: { name },
        })),
      },
      modelTags: {
        connectOrCreate: [{
          where: { name: DEFAULT_MODEL_TAG },
          create: { name: DEFAULT_MODEL_TAG },
        }],
      },
      category: {
        connectOrCreate: {
          where: { name: DEFAULT_CATEGORY },
          create: { name: DEFAULT_CATEGORY },
        },
      },
      createdAt: createdAt,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    
    const auth = verifyAuth(request, body);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: `Authentication failed: ${auth.error}` },
        { status: 401 }
      );
    }

    const { 
      skipR2 = false, 
      limit = 0, 
      offset = 0,
      skipSimilarity = false,
    } = body as { 
      skipR2?: boolean; 
      limit?: number;
      offset?: number;
      skipSimilarity?: boolean;
    };

    const stats: ImportStats = {
      total: 0,
      processed: 0,
      success: 0,
      skippedByUrl: 0,
      skippedBySimilarity: 0,
      imageUploadSuccess: 0,
      imageUploadFailed: 0,
      errors: [],
    };

    // Load data dynamically
    const promptsData = loadPromptsData();
    const items = promptsData.prompts;
    stats.total = items.length;

    // Apply offset and limit
    let itemsToProcess = items;
    if (offset > 0) {
      itemsToProcess = itemsToProcess.slice(offset);
    }
    if (limit > 0) {
      itemsToProcess = itemsToProcess.slice(0, limit);
    }

    // Get existing data
    const existingSources = await getExistingSources();
    const existingPrompts = await getExistingPrompts();
    const existingTags = await getExistingTags();

    // Batch deduplication tracking
    const batchSources = new Set<string>();
    const batchPrompts: Array<{ id: string; prompt: string }> = [];

    // Process each item
    for (const item of itemsToProcess) {
      stats.processed++;

      try {
        // Validate required fields
        if (!item.title || !item.prompt) {
          stats.errors.push(`Missing required fields: ${item.title || 'untitled'}`);
          continue;
        }

        // Check URL duplicate
        const sourceUrl = item.source || '';
        if (sourceUrl && sourceUrl !== 'unknown') {
          if (existingSources.has(sourceUrl) || batchSources.has(sourceUrl)) {
            stats.skippedByUrl++;
            continue;
          }
        }

        // Check similarity (unless skipped)
        if (!skipSimilarity && item.prompt) {
          const dbSimilarity = checkSimilarity(item.prompt, existingPrompts);
          if (dbSimilarity.isSimilar) {
            stats.skippedBySimilarity++;
            continue;
          }

          const batchSimilarity = checkSimilarity(item.prompt, batchPrompts);
          if (batchSimilarity.isSimilar) {
            stats.skippedBySimilarity++;
            continue;
          }
        }

        // Extract image URLs
        const rawImageUrls: string[] = [];
        if (item.imageUrls && Array.isArray(item.imageUrls)) {
          rawImageUrls.push(...item.imageUrls);
        } else if (item.imageUrl) {
          rawImageUrls.push(item.imageUrl);
        }

        // Process images
        const imageResult = await processImages(rawImageUrls, skipR2);
        stats.imageUploadSuccess += imageResult.successCount;
        stats.imageUploadFailed += imageResult.failedCount;

        // Match tags
        const matchedTags = matchTags(item.tags || [], existingTags);

        // Create record
        await createPrompt(item, imageResult.urls, matchedTags);

        // Add to batch tracking
        if (sourceUrl && sourceUrl !== 'unknown') {
          batchSources.add(sourceUrl);
        }
        if (item.prompt) {
          batchPrompts.push({ id: `batch-${batchPrompts.length}`, prompt: item.prompt });
        }

        stats.success++;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`${item.title}: ${errorMsg}`);
      }
    }

    // Revalidate frontend cache
    try {
      revalidatePath('/zh', 'page');
      revalidatePath('/en', 'page');
      revalidatePath('/', 'page');
      console.log('[Prompts Data Import] Cache revalidated');
    } catch (revalidateError) {
      console.warn('[Prompts Data Import] Cache revalidation failed:', revalidateError);
    }

    return NextResponse.json({
      success: true,
      data: {
        version: API_VERSION,
        message: '导入完成',
        stats: {
          总数据量: stats.total,
          本次处理: stats.processed,
          成功导入: stats.success,
          '跳过(URL重复)': stats.skippedByUrl,
          '跳过(内容相似)': stats.skippedBySimilarity,
          图片上传成功: stats.imageUploadSuccess,
          图片上传失败: stats.imageUploadFailed,
          错误数: stats.errors.length,
        },
        errors: stats.errors.slice(0, 10),
        r2Configured: isR2Configured(),
        skipR2,
        defaults: {
          category: DEFAULT_CATEGORY,
          modelTags: [DEFAULT_MODEL_TAG],
        },
      },
    });

  } catch (error) {
    console.error('[Prompts Data Import] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Import failed' },
      { status: 500 }
    );
  }
}

// GET method to check status
export async function GET(request: NextRequest) {
  try {
    const auth = verifyAuth(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: `认证失败: ${auth.error}` },
        { status: 401 }
      );
    }

    const promptsData = loadPromptsData();
    const items = promptsData.prompts;
    const existingCount = await prisma.prompt.count();

    return NextResponse.json({
      success: true,
      data: {
        version: API_VERSION,
        jsonTotal: items.length,
        existingInDb: existingCount,
        r2Configured: isR2Configured(),
        defaults: {
          category: DEFAULT_CATEGORY,
          modelTags: [DEFAULT_MODEL_TAG],
        },
        usage: {
          POST: '/api/import/prompts-data',
          body: {
            secret: 'YOUR_IMPORT_SECRET (必填)',
            skipR2: '是否跳过 R2 上传 (默认: false)',
            limit: '限制处理数量 (默认: 0 = 全部)',
            offset: '从第几条开始 (默认: 0)',
            skipSimilarity: '是否跳过相似度检查 (默认: false)',
          },
        },
      },
    });
  } catch (error) {
    console.error('[Prompts Data Import] GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Query failed' },
      { status: 500 }
    );
  }
}

