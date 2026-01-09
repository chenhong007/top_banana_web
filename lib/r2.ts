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
  // 注意：使用 catch-all 路由 [...key]，不需要 URL 编码
  return `/api/images/${key}`;
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
    console.error('[R2] Upload to R2 error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * 根据域名获取最佳的请求头配置
 * 针对不同网站的防盗链策略使用不同的请求头
 */
function getHeadersForUrl(parsedUrl: URL): Record<string, string> {
  const host = parsedUrl.hostname.toLowerCase();
  
  // 基础请求头 - 模拟真实 Chrome 浏览器
  const baseHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    // 添加更多浏览器特征
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
  };

  // GitHub camo (图片代理)
  if (host.includes('camo.githubusercontent.com')) {
    return {
      ...baseHeaders,
      'Referer': 'https://github.com/',
      'Origin': 'https://github.com',
    };
  }

  // GitHub 原始文件
  if (host.includes('githubusercontent.com') || host.includes('github.com')) {
    return {
      ...baseHeaders,
      'Referer': 'https://github.com/',
    };
  }

  // Linux.do 论坛
  if (host.includes('linux.do')) {
    return {
      ...baseHeaders,
      'Referer': 'https://linux.do/',
      'Origin': 'https://linux.do',
    };
  }

  // YouMind CMS Assets - 重要: 大部分图片来自这里
  if (host.includes('youmind.com') || host.includes('cms-assets.youmind.com')) {
    return {
      ...baseHeaders,
      'Referer': 'https://youmind.com/',
      'Origin': 'https://youmind.com',
    };
  }

  // 通用处理 - 使用目标站点自身作为 Referer
  return {
    ...baseHeaders,
    'Referer': parsedUrl.origin + '/',
  };
}

/**
 * Delay utility for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Upload configuration - adjustable for rate limiting
 */
const UPLOAD_CONFIG = {
  TIMEOUT_MS: 60000,          // 60 seconds timeout (increased from 30s)
  MAX_RETRIES: 3,             // Max retry attempts
  RETRY_BASE_DELAY_MS: 2000,  // Base delay for exponential backoff (2s)
  INTER_REQUEST_DELAY_MS: 500, // Delay between individual requests (500ms)
};

/**
 * 可重试的 HTTP 状态码
 */
function isRetryableStatus(status: number): boolean {
  // 429: Too Many Requests, 503: Service Unavailable, 502: Bad Gateway, 504: Gateway Timeout
  return status === 429 || status === 503 || status === 502 || status === 504;
}

/**
 * 从 URL 下载图片并上传到 R2（带重试机制）
 * Note: URL validation should be done before calling this function
 * Use validateUrlForSSRF from @/lib/security for validation
 */
export async function uploadImageFromUrl(imageUrl: string): Promise<R2UploadResult> {
  // Parse URL first
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    console.error('[R2] Invalid URL format:', imageUrl);
    return { success: false, error: 'Invalid URL format' };
  }

  // Basic protocol check
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    console.error('[R2] Invalid protocol:', parsedUrl.protocol);
    return { success: false, error: 'Only HTTP/HTTPS protocols are allowed' };
  }

  // Retry loop with exponential backoff
  let lastError: string = '';
  for (let attempt = 0; attempt <= UPLOAD_CONFIG.MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 2s, 4s, 8s
      const backoffDelay = UPLOAD_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[R2] Retry attempt ${attempt}/${UPLOAD_CONFIG.MAX_RETRIES} after ${backoffDelay}ms delay...`);
      await delay(backoffDelay);
    }

    const result = await attemptFetchAndUpload(imageUrl, parsedUrl);
    
    if (result.success) {
      return result;
    }

    lastError = result.error || 'Unknown error';
    
    // Check if error is retryable
    const isRetryable = lastError.includes('timeout') || 
                        lastError.includes('429') || 
                        lastError.includes('503') || 
                        lastError.includes('502') ||
                        lastError.includes('504') ||
                        lastError.includes('network') ||
                        lastError.includes('ECONNRESET');
    
    if (!isRetryable) {
      // Non-retryable error, return immediately
      return result;
    }
  }

  console.error(`[R2] All ${UPLOAD_CONFIG.MAX_RETRIES + 1} attempts failed for:`, imageUrl.substring(0, 80));
  return { success: false, error: `Failed after ${UPLOAD_CONFIG.MAX_RETRIES + 1} attempts: ${lastError}` };
}

/**
 * Single attempt to fetch and upload image
 */
async function attemptFetchAndUpload(imageUrl: string, parsedUrl: URL): Promise<R2UploadResult> {
  try {
    // Get optimized headers for this domain
    const headers = getHeadersForUrl(parsedUrl);

    // Fetch with timeout control
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(imageUrl, {
        headers,
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const statusInfo = `${response.status} ${response.statusText}`;
        
        // Provide detailed error messages
        if (response.status === 403) {
          return { success: false, error: `Access denied (403): 防盗链保护` };
        }
        if (response.status === 404) {
          return { success: false, error: `Not found (404): 图片已删除` };
        }
        if (isRetryableStatus(response.status)) {
          return { success: false, error: `Retryable error (${statusInfo})` };
        }
        
        return { success: false, error: `Fetch failed: ${statusInfo}` };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      
      if (buffer.length === 0) {
        return { success: false, error: 'Empty response body' };
      }

      // Validate content type
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
        return { success: false, error: `Not an image: ${contentType}` };
      }
      
      // Extract filename from URL
      const urlPath = parsedUrl.pathname;
      const fileName = urlPath.split('/').pop() || 'image.jpg';
      
      // Upload to R2
      const result = await uploadImageToR2(buffer, fileName, contentType);
      
      return result;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          return { success: false, error: `timeout (${UPLOAD_CONFIG.TIMEOUT_MS / 1000}s)` };
        }
        return { success: false, error: fetchError.message };
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('[R2] Upload attempt error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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
    // Error deleting from R2
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
    // Error listing R2 images
    return [];
  }
}

/**
 * 获取 R2 图片内容流
 */
export async function getImageStreamFromR2(key: string): Promise<ReadableStream | null> {
  try {
    const client = getR2Client();

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await client.send(command);
    
    return response.Body as ReadableStream;
  } catch (error) {
    // Error getting image from R2
    return null;
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
      for await (const chunk of (response.Body as any)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
    
    return null;
  } catch (error) {
    // Error getting image from R2
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
    // Error generating presigned URL
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
  
  // 检查是否是公开 URL (使用环境变量配置的)
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    return true;
  }
  
  // 检查是否是 API 代理格式
  if (url.includes('/api/images/')) {
    return true;
  }
  
  // 检查是否匹配已知的 R2 公开 URL 模式
  // 即使当前环境没有配置 R2_PUBLIC_URL，也能识别之前环境上传的图片
  if (url.includes('images.topai.ink/images/')) {
    return true;
  }
  
  // 检查是否是通用的 R2 路径模式 (images/ 开头，包含时间戳)
  // 格式: https://*/images/{timestamp}-{random}-{name}.{ext}
  const r2PathPattern = /\/images\/\d{13}-[a-z0-9]{6,}-/;
  if (r2PathPattern.test(url)) {
    return true;
  }
  
  return false;
}

