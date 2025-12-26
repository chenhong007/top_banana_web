/**
 * JSON Prompts Import Script
 * 从 data/prompts.json 导入 prompt 数据到数据库
 * 
 * 功能：
 * 1. Source URL 去重
 * 2. Prompt 相似度 > 90% 去重
 * 3. 图片上传到 R2（可选）
 * 4. 智能标签匹配复用
 * 5. 自动生成描述
 * 
 * 运行方式: 
 *   npx tsx scripts/import-prompts-json.ts           # 默认模式（自动检测 R2）
 *   npx tsx scripts/import-prompts-json.ts --no-r2   # 跳过 R2 上传，使用原始 URL
 *   npx tsx scripts/import-prompts-json.ts --dry-run # 模拟运行，不实际写入数据库
 */

import * as fs from 'fs';
import * as path from 'path';
import prisma from '../lib/db';
import { uploadImageFromUrl, isR2Configured } from '../lib/r2';
import { checkPromptSimilarity } from '../lib/text-similarity';

// 解析命令行参数
const args = process.argv.slice(2);
const SKIP_R2 = args.includes('--no-r2');
const DRY_RUN = args.includes('--dry-run');

// 配置常量
const IMAGE_URL_PREFIX = 'https://opennana.com/awesome-prompt-gallery/';
const SIMILARITY_THRESHOLD = 0.9; // 90%
const MAX_TAGS = 3; // 最多取前3个标签
const DEFAULT_MODEL_TAG = 'Banana';
const DEFAULT_CATEGORY = '文生图';

// JSON 数据类型定义
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
  examples: string[];
  notes: string[];
  originFile: string;
  description: string;
  tags: string[];
  coverImage: string;
}

interface JsonData {
  generatedAt: string;
  total: number;
  items: JsonPromptItem[];
}

// 统计数据
interface ImportStats {
  total: number;
  success: number;
  skippedByUrl: number;
  skippedBySimilarity: number;
  imageUploadSuccess: number;
  imageUploadFailed: number;
  errors: string[];
}

/**
 * 加载 JSON 数据
 */
function loadJsonData(): JsonData {
  const jsonPath = path.join(process.cwd(), 'data', 'prompts.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(rawData) as JsonData;
}

/**
 * 获取数据库中所有现有的 source URL
 */
async function getExistingSources(): Promise<Set<string>> {
  const prompts = await prisma.prompt.findMany({
    select: { source: true },
  });
  return new Set(prompts.map(p => p.source).filter(s => s && s !== 'unknown'));
}

/**
 * 获取数据库中所有现有的 prompt 内容用于相似度检查
 */
async function getExistingPrompts(): Promise<Array<{ id: string; prompt: string }>> {
  return await prisma.prompt.findMany({
    select: { id: true, prompt: true },
  });
}

/**
 * 获取数据库中所有现有标签（小写形式用于匹配）
 */
async function getExistingTags(): Promise<Map<string, string>> {
  const tags = await prisma.tag.findMany({
    select: { name: true },
  });
  // Map: lowercase -> original name
  const tagMap = new Map<string, string>();
  for (const tag of tags) {
    tagMap.set(tag.name.toLowerCase(), tag.name);
  }
  return tagMap;
}

/**
 * 智能匹配标签 - 优先复用已有标签
 */
function matchTags(itemTags: string[], existingTags: Map<string, string>): string[] {
  const result: string[] = [];
  const tagsToProcess = itemTags.slice(0, MAX_TAGS);
  
  for (const tag of tagsToProcess) {
    const lowerTag = tag.toLowerCase();
    // 尝试匹配已有标签
    if (existingTags.has(lowerTag)) {
      result.push(existingTags.get(lowerTag)!);
    } else {
      // 使用原始标签名
      result.push(tag);
    }
  }
  
  return result;
}

/**
 * 生成描述 - 根据标题和 prompt 内容生成简短描述
 */
function generateDescription(title: string, prompt: string): string {
  // 如果 prompt 太长，截取前 200 个字符
  const truncatedPrompt = prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt;
  return `${title}。${truncatedPrompt}`;
}

/**
 * 检查 prompt 是否与现有数据相似
 */
function checkSimilarity(
  promptText: string,
  existingPrompts: Array<{ id: string; prompt: string }>
): { isSimilar: boolean; similarity: number; matchedId?: string } {
  for (const existing of existingPrompts) {
    const result = checkPromptSimilarity(promptText, existing.prompt, SIMILARITY_THRESHOLD);
    if (result.isSimilar) {
      return {
        isSimilar: true,
        similarity: result.similarity,
        matchedId: existing.id,
      };
    }
  }
  return { isSimilar: false, similarity: 0 };
}

/**
 * 处理并上传图片到 R2
 */
async function processImages(images: string[]): Promise<{ urls: string[]; successCount: number; failedCount: number }> {
  const urls: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  // 如果指定了 --no-r2 参数，直接使用原始 URL
  if (SKIP_R2) {
    for (const image of images) {
      urls.push(IMAGE_URL_PREFIX + image);
    }
    return { urls, successCount: 0, failedCount: 0 };
  }

  if (!isR2Configured()) {
    console.warn('⚠️ R2 未配置，将使用原始 URL（提示：使用 --no-r2 参数可跳过此警告）');
    // 如果 R2 未配置，直接返回拼接后的原始 URL
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
        console.warn(`  ⚠️ 图片上传失败: ${fullUrl} - ${result.error}`);
        // 失败时使用原始 URL
        urls.push(fullUrl);
        failedCount++;
      }
    } catch (error) {
      console.warn(`  ⚠️ 图片上传异常: ${fullUrl} - ${error}`);
      urls.push(fullUrl);
      failedCount++;
    }
  }

  return { urls, successCount, failedCount };
}

/**
 * 创建单个 prompt 记录
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

/**
 * 主导入函数
 */
async function importPrompts(): Promise<void> {
  console.log('🚀 开始导入 prompts.json 数据...\n');
  
  // 显示运行模式
  if (DRY_RUN) {
    console.log('📋 模式: 模拟运行 (--dry-run)，不会实际写入数据库\n');
  }
  if (SKIP_R2) {
    console.log('📋 模式: 跳过 R2 上传 (--no-r2)，使用原始图片 URL\n');
  } else if (isR2Configured()) {
    console.log('📋 模式: R2 已配置，将上传图片到 R2\n');
  } else {
    console.log('📋 模式: R2 未配置，将使用原始图片 URL\n');
  }

  // 初始化统计
  const stats: ImportStats = {
    total: 0,
    success: 0,
    skippedByUrl: 0,
    skippedBySimilarity: 0,
    imageUploadSuccess: 0,
    imageUploadFailed: 0,
    errors: [],
  };

  try {
    // 1. 加载 JSON 数据
    console.log('📂 加载 JSON 数据...');
    const jsonData = loadJsonData();
    stats.total = jsonData.items.length;
    console.log(`   找到 ${stats.total} 条数据\n`);

    // 2. 获取现有数据用于去重
    console.log('📊 获取现有数据...');
    const existingSources = await getExistingSources();
    console.log(`   现有 source URL: ${existingSources.size} 个`);
    
    const existingPrompts = await getExistingPrompts();
    console.log(`   现有 prompts: ${existingPrompts.length} 条`);
    
    const existingTags = await getExistingTags();
    console.log(`   现有标签: ${existingTags.size} 个\n`);

    // 3. 遍历处理每条数据
    console.log('⏳ 开始处理数据...\n');
    
    // 跟踪本次导入中新增的 source 和 prompts（用于批内去重）
    const batchSources = new Set<string>();
    const batchPrompts: Array<{ id: string; prompt: string }> = [];

    for (let i = 0; i < jsonData.items.length; i++) {
      const item = jsonData.items[i];
      const progress = `[${i + 1}/${stats.total}]`;
      
      try {
        // 检查 source URL 是否重复（数据库 + 本批次）
        if (item.source.url && item.source.url !== 'unknown') {
          if (existingSources.has(item.source.url) || batchSources.has(item.source.url)) {
            console.log(`${progress} ⏭️ 跳过(URL重复): ${item.title}`);
            stats.skippedByUrl++;
            continue;
          }
        }

        // 检查 prompt 相似度（数据库 + 本批次）
        const promptText = item.prompts[0] || '';
        if (promptText) {
          // 先检查数据库
          const dbSimilarity = checkSimilarity(promptText, existingPrompts);
          if (dbSimilarity.isSimilar) {
            console.log(`${progress} ⏭️ 跳过(相似度 ${(dbSimilarity.similarity * 100).toFixed(1)}%): ${item.title}`);
            stats.skippedBySimilarity++;
            continue;
          }
          
          // 再检查本批次
          const batchSimilarity = checkSimilarity(promptText, batchPrompts);
          if (batchSimilarity.isSimilar) {
            console.log(`${progress} ⏭️ 跳过(批内相似度 ${(batchSimilarity.similarity * 100).toFixed(1)}%): ${item.title}`);
            stats.skippedBySimilarity++;
            continue;
          }
        }

        // 处理图片
        const imageResult = await processImages(item.images);
        stats.imageUploadSuccess += imageResult.successCount;
        stats.imageUploadFailed += imageResult.failedCount;

        // 智能匹配标签
        const matchedTags = matchTags(item.tags, existingTags);

        // 创建 prompt 记录
        if (!DRY_RUN) {
          await createPrompt(item, imageResult.urls, matchedTags);
        }

        // 添加到批次跟踪
        if (item.source.url && item.source.url !== 'unknown') {
          batchSources.add(item.source.url);
        }
        if (promptText) {
          batchPrompts.push({ id: `batch-${batchPrompts.length}`, prompt: promptText });
        }

        console.log(`${progress} ✅ ${DRY_RUN ? '(模拟)' : ''}导入成功: ${item.title}`);
        stats.success++;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`${progress} ❌ 导入失败: ${item.title} - ${errorMsg}`);
        stats.errors.push(`${item.title}: ${errorMsg}`);
      }
    }

    // 4. 输出统计结果
    console.log('\n' + '='.repeat(50));
    console.log('📊 导入完成统计');
    console.log('='.repeat(50));
    console.log(`总数据量:        ${stats.total}`);
    console.log(`成功导入:        ${stats.success}`);
    console.log(`跳过(URL重复):   ${stats.skippedByUrl}`);
    console.log(`跳过(内容相似):  ${stats.skippedBySimilarity}`);
    console.log(`图片上传成功:    ${stats.imageUploadSuccess}`);
    console.log(`图片上传失败:    ${stats.imageUploadFailed}`);
    
    if (stats.errors.length > 0) {
      console.log(`\n❌ 错误详情 (${stats.errors.length} 个):`);
      stats.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err}`);
      });
    }
    
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ 导入过程发生严重错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行导入
importPrompts()
  .then(() => {
    console.log('\n✨ 脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });

