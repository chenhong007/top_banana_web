/**
 * JSON Import API Route
 * POST /api/import/json - 从 prompts.json 导入数据到数据库
 * 
 * 使用方式:
 * curl -X POST https://your-domain.com/api/import/json \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer YOUR_IMPORT_SECRET" \
 *   -d '{"skipR2": false, "limit": 10}'
 * 
 * 安全: 需要在环境变量中设置 IMPORT_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { uploadImageFromUrl, isR2Configured } from '@/lib/r2';
import { checkPromptSimilarity } from '@/lib/text-similarity';

// 导入 prompts.json 数据
import promptsData from '@/data/prompts.json';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel Pro: 最大 300 秒

// 配置常量
const IMAGE_URL_PREFIX = 'https://opennana.com/awesome-prompt-gallery/';
const SIMILARITY_THRESHOLD = 0.9;
const MAX_TAGS = 3;
const DEFAULT_MODEL_TAG = 'Banana';
const DEFAULT_CATEGORY = '文生图';

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
 * 验证授权
 */
function verifyAuth(request: NextRequest): { success: boolean; error?: string } {
  const importSecret = process.env.IMPORT_SECRET;
  
  if (!importSecret) {
    return { success: false, error: '服务端未配置 IMPORT_SECRET' };
  }
  
  // 打印调试信息（Vercel Logs 中可见）
  console.log('[Auth Debug] Headers:', Object.fromEntries(request.headers.entries()));
  
  // 尝试多种方式获取 header
  const authHeader = request.headers.get('Authorization') || 
                     request.headers.get('authorization');

  if (!authHeader) {
    return { success: false, error: '缺少 Authorization 头' };
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Authorization 格式错误 (应为 Bearer <token>)' };
  }
  
  const token = authHeader.substring(7);
  if (token !== importSecret) {
    return { success: false, error: 'Token 不匹配' };
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
 * 检查相似度
 */
function checkSimilarity(
  promptText: string,
  existingPrompts: Array<{ id: string; prompt: string }>
): { isSimilar: boolean; similarity: number } {
  for (const existing of existingPrompts) {
    const result = checkPromptSimilarity(promptText, existing.prompt, SIMILARITY_THRESHOLD);
    if (result.isSimilar) {
      return { isSimilar: true, similarity: result.similarity };
    }
  }
  return { isSimilar: false, similarity: 0 };
}

/**
 * 处理图片
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

  for (const image of images) {
    const fullUrl = IMAGE_URL_PREFIX + image;
    try {
      const result = await uploadImageFromUrl(fullUrl);
      if (result.success && result.url) {
        urls.push(result.url);
        successCount++;
      } else {
        urls.push(fullUrl);
        failedCount++;
      }
    } catch {
      urls.push(fullUrl);
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
  tags: string[]
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
    },
  });
}

export async function POST(request: NextRequest) {
  // 验证授权
  const auth = verifyAuth(request);
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: `认证失败: ${auth.error}` },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { skipR2 = false, limit = 0, offset = 0 } = body as { 
      skipR2?: boolean; 
      limit?: number;
      offset?: number;
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

    // 加载数据
    const items = (promptsData as { items: JsonPromptItem[] }).items;
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
        await createPrompt(item, imageResult.urls, matchedTags);

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
    console.error('导入错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '导入失败' },
      { status: 500 }
    );
  }
}

// GET 方法用于查看状态
export async function GET(request: NextRequest) {
  const auth = verifyAuth(request);
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: `认证失败: ${auth.error}` },
      { status: 401 }
    );
  }

  const items = (promptsData as { items: JsonPromptItem[] }).items;
  const existingCount = await prisma.prompt.count();

  return NextResponse.json({
    success: true,
    data: {
      jsonTotal: items.length,
      existingInDb: existingCount,
      r2Configured: isR2Configured(),
      usage: {
        POST: '/api/import/json',
        headers: { 'Authorization': 'Bearer YOUR_IMPORT_SECRET' },
        body: {
          skipR2: '是否跳过 R2 上传 (默认: false)',
          limit: '限制处理数量 (默认: 0 = 全部)',
          offset: '从第几条开始 (默认: 0)',
        },
      },
    },
  });
}
