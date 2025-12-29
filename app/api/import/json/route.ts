/**
 * JSON Import API Route - v1.1
 * POST /api/import/json - 从 prompts.json 导入数据到数据库
 * 
 * 使用方式:
 * curl -X POST https://your-domain.com/api/import/json \
 *   -H "Content-Type: application/json" \
 *   -d '{"secret": "YOUR_SECRET", "skipR2": false, "limit": 10}'
 * 
 * 安全: 需要在环境变量中设置 IMPORT_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { uploadImageFromUrl, isR2Configured } from '@/lib/r2';
import { checkPromptSimilarity } from '@/lib/text-similarity';
import fs from 'fs';
import path from 'path';

// 动态加载 prompts.json 数据（避免静态导入大文件）
function loadPromptsData(): { items: JsonPromptItem[] } {
  const jsonPath = path.join(process.cwd(), 'data', 'prompts.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(rawData);
}

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel Pro: 最大 300 秒
export const revalidate = 0; // 禁用缓存

// 版本标记
const API_VERSION = 'v1.1';

// 配置常量 - 从环境变量读取，提供默认值
const IMAGE_URL_PREFIX = process.env.IMAGE_URL_PREFIX || 'https://opennana.com/awesome-prompt-gallery/';
const SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.9');
const MAX_TAGS = parseInt(process.env.MAX_IMPORT_TAGS || '3', 10);
const DEFAULT_MODEL_TAG = process.env.DEFAULT_MODEL_TAG || 'Banana';
const DEFAULT_CATEGORY = process.env.DEFAULT_CATEGORY || '文生图';

// 类型定义
interface JsonPromptItem {
  id: number;
  slug: string;
  title: string;
  source: {
    name: string;
    url: string;
  };
  model: string;
  images: string[];
  prompts: string[];
  tags: string[];
  coverImage: string;
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
 * 验证授权 - v1.1
 * 支持从 Header 或 Body 读取 token
 */
function verifyAuth(request: NextRequest, body?: Record<string, unknown>): { success: boolean; error?: string } {
  const importSecret = process.env.IMPORT_SECRET;
  
  if (!importSecret) {
    return { success: false, error: 'Server IMPORT_SECRET not configured' };
  }
  
  // 1. 尝试从 Header 获取
  let token = request.headers.get('Authorization')?.replace('Bearer ', '') || 
              request.headers.get('authorization')?.replace('Bearer ', '');
  
  // 2. 如果 Header 没有，尝试从 Body 获取
  if (!token && body?.secret && typeof body.secret === 'string') {
    token = body.secret;
  }

  if (!token) {
    return { success: false, error: 'Missing Authorization header or secret parameter' };
  }
  
  // 3. 验证 token
  if (token !== importSecret) {
    return { success: false, error: 'Invalid token' };
  }

  return { success: true };
}

/**
 * 获取现有 source URLs
 */
async function getExistingSources(): Promise<Set<string>> {
  const prompts = await prisma.prompt.findMany({
    select: { source: true },
  });
  return new Set(prompts.map(p => p.source).filter(s => s && s !== 'unknown'));
}

/**
 * 获取现有 prompts 用于相似度检查
 */
async function getExistingPrompts(): Promise<Array<{ id: string; prompt: string }>> {
  return await prisma.prompt.findMany({
    select: { id: true, prompt: true },
  });
}

/**
 * 获取现有标签
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
 * 智能匹配标签
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
 * 生成描述
 */
function generateDescription(title: string, prompt: string): string {
  const truncatedPrompt = prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt;
  return `${title}。${truncatedPrompt}`;
}

/**
 * 检查相似度（优化版：限制检查数量，避免超时）
 */
function checkSimilarity(
  promptText: string,
  existingPrompts: Array<{ id: string; prompt: string }>
): { isSimilar: boolean; similarity: number } {
  // 优化1：只检查最近的 100 条记录（假设新数据更可能与近期数据重复）
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
 * 处理图片（优化版：并行上传）
 */
async function processImages(images: string[], skipR2: boolean): Promise<{ urls: string[]; successCount: number; failedCount: number }> {
  const urls: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  if (skipR2 || !isR2Configured()) {
    for (const image of images) {
      urls.push(IMAGE_URL_PREFIX + image);
    }
    return { urls, successCount: 0, failedCount: 0 };
  }

  // 优化：并行上传所有图片
  const uploadPromises = images.map(async (image) => {
    const fullUrl = IMAGE_URL_PREFIX + image;
    try {
      const result = await uploadImageFromUrl(fullUrl);
      if (result.success && result.url) {
        return { url: result.url, success: true };
      } else {
        return { url: fullUrl, success: false };
      }
    } catch {
      return { url: fullUrl, success: false };
    }
  });

  const results = await Promise.all(uploadPromises);
  
  for (const result of results) {
    urls.push(result.url);
    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  return { urls, successCount, failedCount };
}

/**
 * 创建单个 prompt
 */
async function createPrompt(
  item: JsonPromptItem,
  imageUrls: string[],
  tags: string[],
  createdAt?: Date
): Promise<void> {
  const promptText = item.prompts[0] || '';
  const description = generateDescription(item.title, promptText);

  await prisma.prompt.create({
    data: {
      effect: item.title,
      description: description,
      prompt: promptText,
      source: item.source.url,
      imageUrl: imageUrls[0] || null,
      imageUrls: imageUrls,
      tags: {
        connectOrCreate: tags.map((name) => ({
          where: { name },
          create: { name },
        })),
      },
      modelTags: {
        connectOrCreate: {
          where: { name: DEFAULT_MODEL_TAG },
          create: { name: DEFAULT_MODEL_TAG },
        },
      },
      category: {
        connectOrCreate: {
          where: { name: DEFAULT_CATEGORY },
          create: { name: DEFAULT_CATEGORY },
        },
      },
      createdAt: createdAt || new Date(),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // 先解析 body
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    
    // 验证授权 (传入 body)
    const auth = verifyAuth(request, body);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: `Authentication failed: ${auth.error}` },
        { status: 401 }
      );
    }

    const { skipR2 = false, limit = 0, offset = 0, createdAt } = body as { 
      skipR2?: boolean; 
      limit?: number;
      offset?: number;
      createdAt?: string;
    };

    // 解析创建时间，如果提供的话
    const parsedCreatedAt = createdAt ? new Date(createdAt) : undefined;

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

    // 加载数据（动态读取）
    const promptsData = loadPromptsData();
    const items = promptsData.items;
    stats.total = items.length;

    // 应用 offset 和 limit
    let itemsToProcess = items;
    if (offset > 0) {
      itemsToProcess = itemsToProcess.slice(offset);
    }
    if (limit > 0) {
      itemsToProcess = itemsToProcess.slice(0, limit);
    }

    // 获取现有数据
    const existingSources = await getExistingSources();
    const existingPrompts = await getExistingPrompts();
    const existingTags = await getExistingTags();

    // 批内去重跟踪
    const batchSources = new Set<string>();
    const batchPrompts: Array<{ id: string; prompt: string }> = [];

    // 处理每条数据
    for (const item of itemsToProcess) {
      stats.processed++;
      const itemStartTime = Date.now();

      try {
        // 检查 URL 重复
        if (item.source.url && item.source.url !== 'unknown') {
          if (existingSources.has(item.source.url) || batchSources.has(item.source.url)) {
            stats.skippedByUrl++;
            continue;
          }
        }

        // 检查相似度
        const promptText = item.prompts[0] || '';
        if (promptText) {
          const dbSimilarity = checkSimilarity(promptText, existingPrompts);
          if (dbSimilarity.isSimilar) {
            stats.skippedBySimilarity++;
            continue;
          }

          const batchSimilarity = checkSimilarity(promptText, batchPrompts);
          if (batchSimilarity.isSimilar) {
            stats.skippedBySimilarity++;
            continue;
          }
        }

        // 处理图片
        const imageResult = await processImages(item.images, skipR2);
        stats.imageUploadSuccess += imageResult.successCount;
        stats.imageUploadFailed += imageResult.failedCount;

        // 匹配标签
        const matchedTags = matchTags(item.tags, existingTags);

        // 创建记录
        await createPrompt(item, imageResult.urls, matchedTags, parsedCreatedAt);

        // 添加到批次跟踪
        if (item.source.url && item.source.url !== 'unknown') {
          batchSources.add(item.source.url);
        }
        if (promptText) {
          batchPrompts.push({ id: `batch-${batchPrompts.length}`, prompt: promptText });
        }

        stats.success++;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`${item.title}: ${errorMsg}`);
      }
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
        errors: stats.errors.slice(0, 10), // 只返回前10个错误
        r2Configured: isR2Configured(),
        skipR2,
      },
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Import failed' },
      { status: 500 }
    );
  }
}

// GET 方法用于查看状态
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
    const items = promptsData.items;
    const existingCount = await prisma.prompt.count();

    return NextResponse.json({
      success: true,
      data: {
        version: API_VERSION,
        jsonTotal: items.length,
        existingInDb: existingCount,
        r2Configured: isR2Configured(),
        usage: {
          POST: '/api/import/json',
          body: {
            secret: 'YOUR_IMPORT_SECRET (必填)',
            skipR2: '是否跳过 R2 上传 (默认: false)',
            limit: '限制处理数量 (默认: 0 = 全部)',
            offset: '从第几条开始 (默认: 0)',
          },
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Query failed' },
      { status: 500 }
    );
  }
}
