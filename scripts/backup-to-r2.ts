/**
 * 数据库备份脚本 - 自动备份到 Cloudflare R2
 * 
 * 使用方法:
 *   npx tsx scripts/backup-to-r2.ts
 * 
 * 功能:
 *   - 导出所有数据库数据为 JSON 格式
 *   - 上传备份文件到 Cloudflare R2
 *   - 自动清理超过指定天数的旧备份
 *   - 支持 gzip 压缩
 * 
 * 环境变量:
 *   - DATABASE_URL: 数据库连接字符串
 *   - CLOUDFLARE_R2_ACCOUNT_ID: R2 账户 ID
 *   - CLOUDFLARE_R2_ACCESS_KEY_ID: R2 访问密钥 ID
 *   - CLOUDFLARE_R2_SECRET_ACCESS_KEY: R2 访问密钥
 *   - CLOUDFLARE_R2_BUCKET_NAME: R2 存储桶名称 (默认: topai-images)
 *   - BACKUP_RETENTION_DAYS: 备份保留天数 (默认: 30)
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { gzipSync } from 'zlib';

// 配置
const BACKUP_PREFIX = 'backupdb/';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

// R2 配置
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'topai-images';

// 初始化 Prisma 客户端
const prisma = new PrismaClient();

// 检查 R2 配置
function checkR2Config(): boolean {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('❌ Cloudflare R2 未配置。请设置以下环境变量:');
    console.error('   - CLOUDFLARE_R2_ACCOUNT_ID');
    console.error('   - CLOUDFLARE_R2_ACCESS_KEY_ID');
    console.error('   - CLOUDFLARE_R2_SECRET_ACCESS_KEY');
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

// 生成备份文件名
function generateBackupFileName(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  return `${BACKUP_PREFIX}backup_${timestamp}.json.gz`;
}

// 导出数据库数据
async function exportDatabaseData(): Promise<object> {
  console.log('📦 正在导出数据库数据...');

  const [prompts, categories, modelTags, tags, images] = await Promise.all([
    prisma.prompt.findMany({
      include: {
        category: true,
        modelTags: true,
        tags: true,
        images: true,
      },
    }),
    prisma.category.findMany(),
    prisma.modelTag.findMany(),
    prisma.tag.findMany(),
    prisma.image.findMany(),
  ]);

  const backup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    statistics: {
      prompts: prompts.length,
      categories: categories.length,
      modelTags: modelTags.length,
      tags: tags.length,
      images: images.length,
    },
    data: {
      prompts,
      categories,
      modelTags,
      tags,
      images,
    },
  };

  console.log(`✅ 数据导出完成:`);
  console.log(`   - Prompts: ${prompts.length}`);
  console.log(`   - Categories: ${categories.length}`);
  console.log(`   - Model Tags: ${modelTags.length}`);
  console.log(`   - Tags: ${tags.length}`);
  console.log(`   - Images: ${images.length}`);

  return backup;
}

// 上传备份到 R2
async function uploadBackupToR2(data: object, fileName: string): Promise<boolean> {
  console.log('☁️  正在上传备份到 R2...');

  try {
    const client = getR2Client();
    
    // 压缩数据
    const jsonString = JSON.stringify(data, null, 2);
    const compressedData = gzipSync(Buffer.from(jsonString, 'utf-8'));
    
    const originalSize = Buffer.byteLength(jsonString, 'utf-8');
    const compressedSize = compressedData.length;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(`   原始大小: ${formatBytes(originalSize)}`);
    console.log(`   压缩后: ${formatBytes(compressedSize)} (节省 ${compressionRatio}%)`);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: compressedData,
      ContentType: 'application/gzip',
      ContentEncoding: 'gzip',
      Metadata: {
        'backup-version': '1.0',
        'original-size': originalSize.toString(),
        'compressed-size': compressedSize.toString(),
      },
    });

    await client.send(command);
    console.log(`✅ 备份已上传: ${fileName}`);
    return true;
  } catch (error) {
    console.error('❌ 上传失败:', error);
    return false;
  }
}

// 清理旧备份
async function cleanupOldBackups(): Promise<void> {
  console.log(`🧹 正在清理 ${RETENTION_DAYS} 天前的旧备份...`);

  try {
    const client = getR2Client();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    // 列出所有备份文件
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: BACKUP_PREFIX,
    });

    const response = await client.send(listCommand);
    const oldBackups = (response.Contents || []).filter((item) => {
      return item.LastModified && item.LastModified < cutoffDate;
    });

    if (oldBackups.length === 0) {
      console.log('   没有需要清理的旧备份');
      return;
    }

    // 删除旧备份
    for (const backup of oldBackups) {
      if (backup.Key) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: backup.Key,
        });
        await client.send(deleteCommand);
        console.log(`   已删除: ${backup.Key}`);
      }
    }

    console.log(`✅ 已清理 ${oldBackups.length} 个旧备份`);
  } catch (error) {
    console.error('⚠️  清理旧备份时出错:', error);
  }
}

// 列出现有备份
async function listExistingBackups(): Promise<void> {
  console.log('📋 现有备份列表:');

  try {
    const client = getR2Client();
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: BACKUP_PREFIX,
    });

    const response = await client.send(listCommand);
    const backups = response.Contents || [];

    if (backups.length === 0) {
      console.log('   (无备份)');
      return;
    }

    // 按时间倒序排列
    backups.sort((a, b) => {
      const timeA = a.LastModified?.getTime() || 0;
      const timeB = b.LastModified?.getTime() || 0;
      return timeB - timeA;
    });

    for (const backup of backups.slice(0, 10)) {
      const date = backup.LastModified?.toLocaleString('zh-CN') || 'Unknown';
      const size = formatBytes(backup.Size || 0);
      console.log(`   ${backup.Key} (${size}, ${date})`);
    }

    if (backups.length > 10) {
      console.log(`   ... 还有 ${backups.length - 10} 个备份`);
    }
  } catch (error) {
    console.error('⚠️  获取备份列表时出错:', error);
  }
}

// 格式化字节数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 主函数
async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('🗄️  数据库备份工具 - Cloudflare R2');
  console.log('='.repeat(50));
  console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`保留天数: ${RETENTION_DAYS}`);
  console.log('');

  // 检查 R2 配置
  if (!checkR2Config()) {
    process.exit(1);
  }

  try {
    // 1. 导出数据
    const backupData = await exportDatabaseData();

    // 2. 生成文件名并上传
    const fileName = generateBackupFileName();
    const uploadSuccess = await uploadBackupToR2(backupData, fileName);

    if (!uploadSuccess) {
      console.error('❌ 备份失败');
      process.exit(1);
    }

    // 3. 清理旧备份
    await cleanupOldBackups();

    // 4. 显示备份列表
    console.log('');
    await listExistingBackups();

    console.log('');
    console.log('='.repeat(50));
    console.log('✅ 备份完成!');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ 备份过程中发生错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行
main();
