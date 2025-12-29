/**
 * 数据库备份 API
 * 支持手动触发备份和获取备份列表
 * 
 * POST /api/backup - 执行备份
 * GET /api/backup - 获取备份列表
 */

import { NextRequest, NextResponse } from 'next/server';
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
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://images.topai.ink';

// 初始化 Prisma 客户端
const prisma = new PrismaClient();

// 检查 R2 配置
function checkR2Config(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
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

// 格式化字节数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 导出数据库数据
async function exportDatabaseData(): Promise<object> {
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

  return {
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
}

// 上传备份到 R2
async function uploadBackupToR2(data: object, fileName: string): Promise<{ success: boolean; url?: string; size?: string; error?: string }> {
  try {
    const client = getR2Client();
    
    // 压缩数据
    const jsonString = JSON.stringify(data, null, 2);
    const compressedData = gzipSync(Buffer.from(jsonString, 'utf-8'));
    
    const originalSize = Buffer.byteLength(jsonString, 'utf-8');
    const compressedSize = compressedData.length;

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
    
    return {
      success: true,
      url: `${R2_PUBLIC_URL}/${fileName}`,
      size: formatBytes(compressedSize),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

// 清理旧备份
async function cleanupOldBackups(): Promise<number> {
  try {
    const client = getR2Client();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: BACKUP_PREFIX,
    });

    const response = await client.send(listCommand);
    const oldBackups = (response.Contents || []).filter((item) => {
      return item.LastModified && item.LastModified < cutoffDate;
    });

    for (const backup of oldBackups) {
      if (backup.Key) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: backup.Key,
        });
        await client.send(deleteCommand);
      }
    }

    return oldBackups.length;
  } catch (error) {
    return 0;
  }
}

// 获取备份列表
async function listBackups(): Promise<{ key: string; url: string; size: string; date: string }[]> {
  try {
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
        url: `${R2_PUBLIC_URL}/${item.Key}`,
        size: formatBytes(item.Size || 0),
        date: item.LastModified?.toISOString() || '',
      }));

    // 按时间倒序排列
    backups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return backups;
  } catch (error) {
    return [];
  }
}

// POST - 执行备份
export async function POST(request: NextRequest) {
  try {
    // 检查 R2 配置
    if (!checkR2Config()) {
      return NextResponse.json(
        { error: 'Cloudflare R2 未配置' },
        { status: 500 }
      );
    }

    // 导出数据
    const backupData = await exportDatabaseData();

    // 生成文件名并上传
    const fileName = generateBackupFileName();
    const uploadResult = await uploadBackupToR2(backupData, fileName);

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || '备份上传失败' },
        { status: 500 }
      );
    }

    // 清理旧备份
    const cleanedCount = await cleanupOldBackups();

    return NextResponse.json({
      success: true,
      message: '备份成功',
      backup: {
        fileName,
        url: uploadResult.url,
        size: uploadResult.size,
        exportedAt: new Date().toISOString(),
        statistics: (backupData as any).statistics,
      },
      cleanedBackups: cleanedCount,
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '备份失败' },
      { status: 500 }
    );
  }
}

// GET - 获取备份列表
export async function GET(request: NextRequest) {
  try {
    // 检查 R2 配置
    if (!checkR2Config()) {
      return NextResponse.json(
        { error: 'Cloudflare R2 未配置' },
        { status: 500 }
      );
    }

    const backups = await listBackups();

    return NextResponse.json({
      success: true,
      backups,
      count: backups.length,
    });
  } catch (error) {
    console.error('List backups error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取备份列表失败' },
      { status: 500 }
    );
  }
}
