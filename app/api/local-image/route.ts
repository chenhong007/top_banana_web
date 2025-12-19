import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imagePath = searchParams.get('path');

  if (!imagePath) {
    return new NextResponse('Path is required', { status: 400 });
  }

  // 安全检查：移除 ./ 前缀，规范化路径
  // 允许 ./data/image/... 或 data/image/...
  let relativePath = imagePath;
  if (relativePath.startsWith('./')) {
    relativePath = relativePath.substring(2);
  }

  // 只允许访问 data/image 目录
  if (!relativePath.startsWith('data/image/') && !relativePath.startsWith('data\\image\\')) {
    console.error(`Access denied: ${relativePath} is not in data/image`);
    return new NextResponse('Access denied: Only local images in data/image are allowed', { status: 403 });
  }

  // 防止路径遍历
  if (relativePath.includes('..')) {
      return new NextResponse('Invalid path', { status: 403 });
  }

  const fullPath = path.join(process.cwd(), relativePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`Image not found: ${fullPath}`);
    return new NextResponse('Image not found', { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    
    let contentType = 'application/octet-stream';
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error reading image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

