/**
 * Cloudflare R2 Storage Integration
 * 用于图片上传、删除、列表等功能
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 配置
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'topai-images';
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || ''; // 公开访问的 URL，如 https://images.yourdomain.com

// 检查 R2 是否配置
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

// 创建 S3 客户端 (R2 兼容 S3 API)
function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 is not configured. Please set the environment variables.');
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

// 图片类型定义
export interface R2UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

export interface R2ImageInfo {
  key: string;
  url: string;
  size?: number;
  lastModified?: Date;
}

/**
 * 生成唯一的图片文件名
 */
function generateImageKey(originalName: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const safeName = originalName
    .replace(/\.[^/.]+$/, '') // 移除扩展名
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '_') // 只保留安全字符
    .substring(0, 50); // 限制长度
  
  return `images/${timestamp}-${randomSuffix}-${safeName}.${extension}`;
}

/**
 * 获取图片的公开访问 URL
 */
export function getPublicUrl(key: string): string {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  // 如果没有配置公开 URL，返回 API 代理路径
  return `/api/images/${encodeURIComponent(key)}`;
}

/**
 * 上传图片到 R2
 */
export async function uploadImageToR2(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<R2UploadResult> {
  try {
    const client = getR2Client();
    const key = generateImageKey(fileName);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      // 设置缓存控制
      CacheControl: 'public, max-age=31536000',
    });

    await client.send(command);

    return {
      success: true,
      key,
      url: getPublicUrl(key),
    };
  } catch (error) {
    console.error('Error uploading to R2:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * 从 URL 下载图片并上传到 R2
 */
export async function uploadImageFromUrl(imageUrl: string): Promise<R2UploadResult> {
  try {
    // 获取图片内容
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': new URL(imageUrl).origin,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // 从 URL 提取文件名
    const urlPath = new URL(imageUrl).pathname;
    const fileName = urlPath.split('/').pop() || 'image.jpg';

    return uploadImageToR2(buffer, fileName, contentType);
  } catch (error) {
    console.error('Error uploading image from URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload from URL',
    };
  }
}

/**
 * 删除 R2 中的图片
 */
export async function deleteImageFromR2(key: string): Promise<boolean> {
  try {
    const client = getR2Client();

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting from R2:', error);
    return false;
  }
}

/**
 * 列出 R2 中的所有图片
 */
export async function listImagesInR2(prefix = 'images/', maxKeys = 1000): Promise<R2ImageInfo[]> {
  try {
    const client = getR2Client();

    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await client.send(command);

    return (response.Contents || []).map((item) => ({
      key: item.Key || '',
      url: getPublicUrl(item.Key || ''),
      size: item.Size,
      lastModified: item.LastModified,
    }));
  } catch (error) {
    console.error('Error listing R2 images:', error);
    return [];
  }
}

/**
 * 获取 R2 图片内容
 */
export async function getImageFromR2(key: string): Promise<Buffer | null> {
  try {
    const client = getR2Client();

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await client.send(command);
    
    if (response.Body) {
      const chunks: Uint8Array[] = [];
      // @ts-expect-error - Body is a stream
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting image from R2:', error);
    return null;
  }
}

/**
 * 获取预签名 URL（用于直接上传）
 */
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  expiresIn = 3600
): Promise<{ uploadUrl: string; key: string } | null> {
  try {
    const client = getR2Client();
    const key = generateImageKey(fileName);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });

    return { uploadUrl, key };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return null;
  }
}

/**
 * 检查图片是否存在于 R2
 */
export async function imageExistsInR2(key: string): Promise<boolean> {
  try {
    const client = getR2Client();

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * 从 R2 URL 提取 key
 */
export function extractKeyFromR2Url(url: string): string | null {
  if (!url) return null;
  
  // 如果是公开 URL 格式
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    return url.replace(`${R2_PUBLIC_URL}/`, '');
  }
  
  // 如果是 API 代理格式
  const apiMatch = url.match(/\/api\/images\/(.+)/);
  if (apiMatch) {
    return decodeURIComponent(apiMatch[1]);
  }
  
  // 如果本身就是 key
  if (url.startsWith('images/')) {
    return url;
  }
  
  return null;
}

/**
 * 判断 URL 是否是 R2 存储的图片
 */
export function isR2ImageUrl(url: string): boolean {
  if (!url) return false;
  
  // 检查是否是公开 URL
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    return true;
  }
  
  // 检查是否是 API 代理格式
  if (url.includes('/api/images/')) {
    return true;
  }
  
  return false;
}

