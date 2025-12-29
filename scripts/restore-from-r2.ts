/**
 * 数据库恢复脚本 - 从 Cloudflare R2 恢复备份
 * 
 * 使用方法:
 *   npx tsx scripts/restore-from-r2.ts                    # 列出所有备份
 *   npx tsx scripts/restore-from-r2.ts --latest           # 恢复最新备份
 *   npx tsx scripts/restore-from-r2.ts --file <filename>  # 恢复指定备份
 * 
 * 注意: 恢复操作会清空现有数据，请谨慎操作！
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { gunzipSync } from 'zlib';
import * as readline from 'readline';

// R2 配置
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'topai-images';

const BACKUP_PREFIX = 'backupdb/';

// 初始化 Prisma 客户端
const prisma = new PrismaClient();

// 备份数据类型
interface BackupData {
  version: string;
  exportedAt: string;
  statistics: {
    prompts: number;
    categories: number;
    modelTags: number;
    tags: number;
    images: number;
  };
  data: {
    prompts: any[];
    categories: any[];
    modelTags: any[];
    tags: any[];
    images: any[];
  };
}

// 检查 R2 配置
function checkR2Config(): boolean {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('❌ Cloudflare R2 未配置');
    return false;
  }
  return true;
}

// 创建 R2 客户端
function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

// 列出所有备份
async function listBackups(): Promise<{ key: string; date: Date; size: number }[]> {
  const client = getR2Client();
  const listCommand = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: BACKUP_PREFIX,
  });

  const response = await client.send(listCommand);
  const backups = (response.Contents || [])
    .filter((item) => item.Key && item.Key.endsWith('.json.gz'))
    .map((item) => ({
      key: item.Key!,
      date: item.LastModified || new Date(),
      size: item.Size || 0,
    }));

  // 按时间倒序排列
  backups.sort((a, b) => b.date.getTime() - a.date.getTime());
  return backups;
}

// 下载并解压备份
async function downloadBackup(key: string): Promise<BackupData> {
  console.log(`📥 正在下载备份: ${key}`);

  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const response = await client.send(command);

  if (!response.Body) {
    throw new Error('备份文件为空');
  }

  // 读取流数据
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  const compressedData = Buffer.concat(chunks);

  // 解压
  console.log('📦 正在解压数据...');
  const jsonData = gunzipSync(compressedData).toString('utf-8');
  const backup = JSON.parse(jsonData) as BackupData;

  console.log(`✅ 备份加载成功`);
  console.log(`   版本: ${backup.version}`);
  console.log(`   导出时间: ${backup.exportedAt}`);
  console.log(`   Prompts: ${backup.statistics.prompts}`);
  console.log(`   Categories: ${backup.statistics.categories}`);
  console.log(`   Model Tags: ${backup.statistics.modelTags}`);
  console.log(`   Tags: ${backup.statistics.tags}`);
  console.log(`   Images: ${backup.statistics.images}`);

  return backup;
}

// 用户确认
async function confirmRestore(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\n⚠️  警告: 恢复操作将清空现有数据！确定要继续吗？(yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// 恢复数据库
async function restoreDatabase(backup: BackupData): Promise<void> {
  console.log('\n🔄 正在恢复数据库...');

  // 使用事务确保数据一致性
  await prisma.$transaction(async (tx) => {
    // 1. 清空现有数据（按依赖关系顺序）
    console.log('   清空现有数据...');
    await tx.image.deleteMany();
    await tx.prompt.deleteMany();
    await tx.tag.deleteMany();
    await tx.modelTag.deleteMany();
    await tx.category.deleteMany();

    // 2. 恢复 Categories
    if (backup.data.categories.length > 0) {
      console.log(`   恢复 Categories (${backup.data.categories.length})...`);
      for (const category of backup.data.categories) {
        await tx.category.create({
          data: {
            id: category.id,
            name: category.name,
            createdAt: new Date(category.createdAt),
          },
        });
      }
    }

    // 3. 恢复 Tags
    if (backup.data.tags.length > 0) {
      console.log(`   恢复 Tags (${backup.data.tags.length})...`);
      for (const tag of backup.data.tags) {
        await tx.tag.create({
          data: {
            id: tag.id,
            name: tag.name,
          },
        });
      }
    }

    // 4. 恢复 Model Tags
    if (backup.data.modelTags.length > 0) {
      console.log(`   恢复 Model Tags (${backup.data.modelTags.length})...`);
      for (const modelTag of backup.data.modelTags) {
        await tx.modelTag.create({
          data: {
            id: modelTag.id,
            name: modelTag.name,
            icon: modelTag.icon,
            color: modelTag.color,
            type: modelTag.type,
            createdAt: new Date(modelTag.createdAt),
          },
        });
      }
    }

    // 5. 恢复 Prompts（包括关联关系）
    if (backup.data.prompts.length > 0) {
      console.log(`   恢复 Prompts (${backup.data.prompts.length})...`);
      for (const prompt of backup.data.prompts) {
        await tx.prompt.create({
          data: {
            id: prompt.id,
            effect: prompt.effect,
            description: prompt.description,
            prompt: prompt.prompt,
            source: prompt.source,
            imageUrl: prompt.imageUrl,
            imageUrls: prompt.imageUrls || [],
            likes: prompt.likes || 0,
            hearts: prompt.hearts || 0,
            createdAt: new Date(prompt.createdAt),
            updatedAt: new Date(prompt.updatedAt),
            categoryId: prompt.categoryId,
            // 恢复标签关联
            tags: prompt.tags?.length > 0 ? {
              connect: prompt.tags.map((t: any) => ({ id: t.id })),
            } : undefined,
            modelTags: prompt.modelTags?.length > 0 ? {
              connect: prompt.modelTags.map((t: any) => ({ id: t.id })),
            } : undefined,
          },
        });
      }
    }

    // 6. 恢复 Images
    if (backup.data.images.length > 0) {
      console.log(`   恢复 Images (${backup.data.images.length})...`);
      for (const image of backup.data.images) {
        await tx.image.create({
          data: {
            id: image.id,
            key: image.key,
            originalUrl: image.originalUrl,
            url: image.url,
            fileName: image.fileName,
            contentType: image.contentType,
            size: image.size,
            promptId: image.promptId,
            status: image.status || 'active',
            createdAt: new Date(image.createdAt),
            updatedAt: new Date(image.updatedAt),
          },
        });
      }
    }
  });

  console.log('✅ 数据库恢复完成!');
}

// 格式化字节数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 显示备份列表
async function showBackupList(): Promise<void> {
  console.log('\n📋 可用备份列表:');
  console.log('-'.repeat(70));

  const backups = await listBackups();

  if (backups.length === 0) {
    console.log('   (无备份)');
    return;
  }

  backups.forEach((backup, index) => {
    const date = backup.date.toLocaleString('zh-CN');
    const size = formatBytes(backup.size);
    console.log(`${(index + 1).toString().padStart(3)}. ${backup.key}`);
    console.log(`     大小: ${size} | 时间: ${date}`);
  });

  console.log('-'.repeat(70));
  console.log('\n使用方法:');
  console.log('  恢复最新备份: npx tsx scripts/restore-from-r2.ts --latest');
  console.log('  恢复指定备份: npx tsx scripts/restore-from-r2.ts --file <filename>');
}

// 主函数
async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('🔄 数据库恢复工具 - Cloudflare R2');
  console.log('='.repeat(50));

  if (!checkR2Config()) {
    process.exit(1);
  }

  const args = process.argv.slice(2);

  try {
    // 无参数：显示备份列表
    if (args.length === 0) {
      await showBackupList();
      return;
    }

    let backupKey: string | null = null;

    // --latest: 恢复最新备份
    if (args.includes('--latest')) {
      const backups = await listBackups();
      if (backups.length === 0) {
        console.error('❌ 没有找到任何备份');
        process.exit(1);
      }
      backupKey = backups[0].key;
      console.log(`\n将恢复最新备份: ${backupKey}`);
    }

    // --file <filename>: 恢复指定备份
    const fileIndex = args.indexOf('--file');
    if (fileIndex !== -1 && args[fileIndex + 1]) {
      backupKey = args[fileIndex + 1];
      // 如果用户只输入了文件名，添加前缀
      if (!backupKey.startsWith(BACKUP_PREFIX)) {
        backupKey = BACKUP_PREFIX + backupKey;
      }
      console.log(`\n将恢复备份: ${backupKey}`);
    }

    if (!backupKey) {
      console.error('❌ 请指定要恢复的备份');
      console.log('使用 --latest 恢复最新备份');
      console.log('使用 --file <filename> 恢复指定备份');
      process.exit(1);
    }

    // 下载备份
    const backup = await downloadBackup(backupKey);

    // 确认恢复
    const confirmed = await confirmRestore();
    if (!confirmed) {
      console.log('❌ 操作已取消');
      return;
    }

    // 执行恢复
    await restoreDatabase(backup);

    console.log('\n='.repeat(50));
    console.log('✅ 恢复完成!');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ 恢复过程中发生错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行
main();
