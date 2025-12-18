/**
 * 图片迁移脚本：将数据库中所有图片下载并上传到 R2
 * 
 * 功能：
 * 1. 获取数据库中所有有 imageUrl 的 Prompt
 * 2. 跳过已经是 R2 URL 的图片
 * 3. 下载外部 HTTP URL 或本地文件
 * 4. 上传到 Cloudflare R2
 * 5. 更新数据库中的 imageUrl
 * 6. 在 Image 表中记录迁移信息
 * 
 * 使用方法：
 *   npx ts-node scripts/migrate-images-to-r2.ts [--dry-run] [--limit=N] [--batch=N]
 * 
 * 参数：
 *   --dry-run   仅预览，不执行实际迁移
 *   --limit=N   限制处理的图片数量
 *   --batch=N   每批处理的图片数量（默认 10）
 *   --delay=N   批次之间的延迟毫秒数（默认 1000）
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// 首先加载环境变量（必须在导入 Prisma 之前）
// 先加载 .env，再加载 .env.local 覆盖（使用 override: true 确保覆盖）
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local'), override: true });

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 初始化 Prisma
const prisma = new PrismaClient();

// R2 配置
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'topai-images';
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';

// 检查 R2 是否配置
function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

// 创建 S3 客户端
function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 未配置。请设置环境变量：CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

// 生成唯一的图片文件名
function generateImageKey(originalName: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '_')
    .substring(0, 50);
  
  return `images/${timestamp}-${randomSuffix}-${safeName}.${extension}`;
}

// 获取图片的公开访问 URL
function getPublicUrl(key: string): string {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  return `/api/images/${encodeURIComponent(key)}`;
}

// 判断 URL 是否是 R2 存储的图片
function isR2ImageUrl(url: string): boolean {
  if (!url) return false;
  
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    return true;
  }
  
  if (url.includes('/api/images/')) {
    return true;
  }
  
  return false;
}

// 判断是否是本地图片路径
function isLocalImagePath(url: string): boolean {
  return url.startsWith('./data/') || url.startsWith('data/');
}

// 从 URL 提取文件名
function extractFileName(url: string): string {
  try {
    if (isLocalImagePath(url)) {
      return path.basename(url);
    }
    const urlPath = new URL(url).pathname;
    return urlPath.split('/').pop() || 'image.jpg';
  } catch {
    return 'image.jpg';
  }
}

// 根据扩展名获取 MIME 类型
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

// 从外部 URL 下载图片
async function downloadFromUrl(imageUrl: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(imageUrl).origin,
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return { buffer, contentType };
  } catch (error) {
    console.error(`  ❌ 下载失败: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// 从本地文件读取图片
function readLocalImage(imagePath: string): { buffer: Buffer; contentType: string } | null {
  try {
    let relativePath = imagePath;
    if (relativePath.startsWith('./')) {
      relativePath = relativePath.substring(2);
    }

    const fullPath = path.join(process.cwd(), relativePath);

    if (!fs.existsSync(fullPath)) {
      console.error(`  ❌ 本地文件不存在: ${fullPath}`);
      return null;
    }

    const buffer = fs.readFileSync(fullPath);
    const contentType = getMimeType(fullPath);

    return { buffer, contentType };
  } catch (error) {
    console.error(`  ❌ 读取本地文件失败: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// 上传图片到 R2
async function uploadToR2(
  client: S3Client,
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ key: string; url: string } | null> {
  try {
    const key = generateImageKey(fileName);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    });

    await client.send(command);

    return {
      key,
      url: getPublicUrl(key),
    };
  } catch (error) {
    console.error(`  ❌ 上传到 R2 失败: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// 迁移结果统计
interface MigrationStats {
  total: number;
  skipped: number;
  success: number;
  failed: number;
  errors: { promptId: string; effect: string; error: string }[];
}

// 解析命令行参数
function parseArgs(): { dryRun: boolean; limit: number | null; batch: number; delay: number } {
  const args = process.argv.slice(2);
  let dryRun = false;
  let limit: number | null = null;
  let batch = 10;
  let delay = 1000;

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--batch=')) {
      batch = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--delay=')) {
      delay = parseInt(arg.split('=')[1], 10);
    }
  }

  return { dryRun, limit, batch, delay };
}

// 延迟函数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主迁移函数
async function migrateImages(): Promise<void> {
  console.log('\n🚀 开始图片迁移到 R2...\n');

  const { dryRun, limit, batch, delay } = parseArgs();

  if (dryRun) {
    console.log('📝 模式: 预览模式 (--dry-run)，不会执行实际迁移\n');
  }

  // 检查 R2 配置
  if (!isR2Configured()) {
    console.error('❌ Cloudflare R2 未配置！请设置以下环境变量：');
    console.error('   - CLOUDFLARE_R2_ACCOUNT_ID');
    console.error('   - CLOUDFLARE_R2_ACCESS_KEY_ID');
    console.error('   - CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    console.error('   - CLOUDFLARE_R2_BUCKET_NAME (可选，默认: topai-images)');
    console.error('   - CLOUDFLARE_R2_PUBLIC_URL (可选)');
    process.exit(1);
  }

  console.log('✅ R2 配置已加载');
  console.log(`   Bucket: ${R2_BUCKET_NAME}`);
  console.log(`   Public URL: ${R2_PUBLIC_URL || '使用 API 代理'}\n`);

  // 获取所有需要迁移的图片
  const queryOptions: { where: { imageUrl: { not: null } }; select: { id: true; effect: true; imageUrl: true }; take?: number } = {
    where: {
      imageUrl: {
        not: null,
      },
    },
    select: {
      id: true,
      effect: true,
      imageUrl: true,
    },
  };

  if (limit) {
    queryOptions.take = limit;
  }

  const prompts = await prisma.prompt.findMany(queryOptions);

  // 过滤需要迁移的图片
  const promptsToMigrate = prompts.filter(p => {
    if (!p.imageUrl) return false;
    if (isR2ImageUrl(p.imageUrl)) return false;
    return true;
  });

  const stats: MigrationStats = {
    total: prompts.length,
    skipped: prompts.length - promptsToMigrate.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  console.log(`📊 统计信息:`);
  console.log(`   总图片数: ${stats.total}`);
  console.log(`   已在 R2: ${stats.skipped}`);
  console.log(`   待迁移: ${promptsToMigrate.length}`);
  console.log(`   批次大小: ${batch}`);
  console.log(`   批次延迟: ${delay}ms\n`);

  if (promptsToMigrate.length === 0) {
    console.log('✅ 没有需要迁移的图片！\n');
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log('📋 待迁移的图片列表:\n');
    for (const prompt of promptsToMigrate) {
      const type = isLocalImagePath(prompt.imageUrl!) ? '本地' : '远程';
      console.log(`   [${type}] ${prompt.effect}`);
      console.log(`         ${prompt.imageUrl}\n`);
    }
    console.log('💡 使用不带 --dry-run 参数运行以执行实际迁移\n');
    await prisma.$disconnect();
    return;
  }

  // 创建 R2 客户端
  const r2Client = getR2Client();

  // 分批处理
  const batches = Math.ceil(promptsToMigrate.length / batch);
  
  for (let i = 0; i < batches; i++) {
    const start = i * batch;
    const end = Math.min(start + batch, promptsToMigrate.length);
    const currentBatch = promptsToMigrate.slice(start, end);

    console.log(`\n📦 处理批次 ${i + 1}/${batches} (${start + 1} - ${end})...\n`);

    for (const prompt of currentBatch) {
      console.log(`🔄 [${stats.success + stats.failed + 1}/${promptsToMigrate.length}] ${prompt.effect}`);
      console.log(`   原始 URL: ${prompt.imageUrl}`);

      let imageData: { buffer: Buffer; contentType: string } | null = null;

      // 根据 URL 类型下载图片
      if (isLocalImagePath(prompt.imageUrl!)) {
        console.log(`   类型: 本地文件`);
        imageData = readLocalImage(prompt.imageUrl!);
      } else {
        console.log(`   类型: 远程 URL`);
        imageData = await downloadFromUrl(prompt.imageUrl!);
      }

      if (!imageData) {
        stats.failed++;
        stats.errors.push({
          promptId: prompt.id,
          effect: prompt.effect,
          error: '下载/读取失败',
        });
        console.log('');
        continue;
      }

      // 上传到 R2
      const fileName = extractFileName(prompt.imageUrl!);
      const uploadResult = await uploadToR2(r2Client, imageData.buffer, fileName, imageData.contentType);

      if (!uploadResult) {
        stats.failed++;
        stats.errors.push({
          promptId: prompt.id,
          effect: prompt.effect,
          error: '上传到 R2 失败',
        });
        console.log('');
        continue;
      }

      // 更新数据库
      try {
        await prisma.prompt.update({
          where: { id: prompt.id },
          data: { imageUrl: uploadResult.url },
        });

        // 在 Image 表中记录迁移信息
        await prisma.image.create({
          data: {
            key: uploadResult.key,
            originalUrl: prompt.imageUrl!,
            url: uploadResult.url,
            promptId: prompt.id,
            fileName: fileName,
            contentType: imageData.contentType,
            size: imageData.buffer.length,
            status: 'active',
          },
        });

        stats.success++;
        console.log(`   ✅ 已迁移: ${uploadResult.url}`);
      } catch (error) {
        stats.failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        stats.errors.push({
          promptId: prompt.id,
          effect: prompt.effect,
          error: `数据库更新失败: ${errorMsg}`,
        });
        console.log(`   ❌ 数据库更新失败: ${errorMsg}`);
      }

      console.log('');
    }

    // 批次之间延迟
    if (i < batches - 1) {
      console.log(`   ⏳ 等待 ${delay}ms 后处理下一批...`);
      await sleep(delay);
    }
  }

  // 输出最终统计
  console.log('\n' + '='.repeat(50));
  console.log('📊 迁移完成统计:\n');
  console.log(`   ✅ 成功: ${stats.success}`);
  console.log(`   ❌ 失败: ${stats.failed}`);
  console.log(`   ⏭️  跳过 (已在 R2): ${stats.skipped}`);
  console.log(`   📁 总计: ${stats.total}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ 失败详情:');
    for (const error of stats.errors) {
      console.log(`   - ${error.effect}: ${error.error}`);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  await prisma.$disconnect();
}

// 运行迁移
migrateImages().catch(error => {
  console.error('❌ 迁移脚本出错:', error);
  prisma.$disconnect();
  process.exit(1);
});

