/**
 * 图片上传 API
 * POST /api/images/upload (requires authentication)
 * 
 * 支持两种方式：
 * 1. 直接上传文件 (multipart/form-data)
 * 2. 从 URL 下载并上传 (JSON: { url: string })
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToR2, uploadImageFromUrl, isR2Configured } from '@/lib/r2';
import prisma from '@/lib/db';
import { requireAuth, validateUrlForSSRF } from '@/lib/security';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

// 允许的图片类型
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    // 检查 R2 是否配置
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: 'Cloudflare R2 未配置，请设置环境变量' },
        { status: 500 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // 方式1: 从 URL 下载并上传
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { url, promptId } = body;

      if (!url) {
        return NextResponse.json(
          { success: false, error: '缺少图片 URL' },
          { status: 400 }
        );
      }

      // SSRF protection: validate URL before fetching
      const urlValidation = validateUrlForSSRF(url);
      if (!urlValidation.valid) {
        return NextResponse.json(
          { success: false, error: urlValidation.error || 'Invalid URL' },
          { status: 400 }
        );
      }

      const result = await uploadImageFromUrl(url);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || '上传失败' },
          { status: 500 }
        );
      }

      // 尝试保存到数据库（可选，失败不影响上传结果）
      let imageRecord = null;
      try {
        imageRecord = await prisma.image.create({
          data: {
            key: result.key!,
            originalUrl: url,
            url: result.url!,
            promptId: promptId || null,
            status: 'active',
          },
        });
      } catch {
        // 数据库保存失败不影响上传结果
      }

      return NextResponse.json({
        success: true,
        data: {
          id: imageRecord?.id || null,
          key: result.key,
          url: result.url,
          originalUrl: url,
        },
      });
    }

    // 方式2: 直接上传文件
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const promptId = formData.get('promptId') as string | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: '缺少文件' },
          { status: 400 }
        );
      }

      // 验证文件类型
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `不支持的文件类型: ${file.type}` },
          { status: 400 }
        );
      }

      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadImageToR2(buffer, file.name, file.type);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || '上传失败' },
          { status: 500 }
        );
      }

      // 尝试保存到数据库（可选，失败不影响上传结果）
      let imageRecord = null;
      try {
        imageRecord = await prisma.image.create({
          data: {
            key: result.key!,
            url: result.url!,
            fileName: file.name,
            contentType: file.type,
            size: file.size,
            promptId: promptId || null,
            status: 'active',
          },
        });
      } catch {
        // 数据库保存失败不影响上传结果
      }

      return NextResponse.json({
        success: true,
        data: {
          id: imageRecord?.id || null,
          key: result.key,
          url: result.url,
          fileName: file.name,
          size: file.size,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: '不支持的请求类型' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}

// 批量从 URL 上传图片 (requires authentication)
export async function PUT(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: 'Cloudflare R2 未配置' },
        { status: 500 }
      );
    }

    const { urls } = await request.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少 URLs 数组' },
        { status: 400 }
      );
    }

    const results: Array<{ originalUrl: string; newUrl?: string; error?: string }> = [];

    for (const url of urls) {
      try {
        // SSRF protection: validate each URL
        const urlValidation = validateUrlForSSRF(url);
        if (!urlValidation.valid) {
          results.push({ originalUrl: url, error: urlValidation.error || 'Invalid URL' });
          continue;
        }

        const result = await uploadImageFromUrl(url);
        
        if (result.success) {
          // 保存到数据库
          await prisma.image.create({
            data: {
              key: result.key!,
              originalUrl: url,
              url: result.url!,
              status: 'active',
            },
          });
          
          results.push({ originalUrl: url, newUrl: result.url });
        } else {
          results.push({ originalUrl: url, error: result.error });
        }
      } catch (error) {
        results.push({ 
          originalUrl: url, 
          error: error instanceof Error ? error.message : '上传失败' 
        });
      }
    }

    const successCount = results.filter(r => r.newUrl).length;

    return NextResponse.json({
      success: true,
      data: {
        total: urls.length,
        success: successCount,
        failed: urls.length - successCount,
        results,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Batch upload failed' },
      { status: 500 }
    );
  }
}

