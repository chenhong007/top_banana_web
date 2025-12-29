/**
 * 从 X.com (Twitter) 提取图片 API
 * POST /api/extract-x-images
 * 
 * 使用 FXTwitter API 获取推文图片，并上传到 R2
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadImageFromUrl, isR2Configured, isR2ImageUrl } from '@/lib/r2';
import { requireAuth } from '@/lib/security';
import prisma from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * 从 X.com URL 解析用户名和推文 ID
 */
function parseXUrl(url: string): { username: string; tweetId: string } | null {
  try {
    const parsedUrl = new URL(url);
    
    // 支持 x.com 和 twitter.com
    if (!parsedUrl.hostname.includes('x.com') && !parsedUrl.hostname.includes('twitter.com')) {
      return null;
    }
    
    // 匹配 /{username}/status/{tweetId}
    const match = parsedUrl.pathname.match(/^\/([^\/]+)\/status\/(\d+)/);
    if (!match) {
      return null;
    }
    
    return {
      username: match[1],
      tweetId: match[2],
    };
  } catch {
    return null;
  }
}

/**
 * 使用 FXTwitter API 获取推文数据
 */
async function fetchTweetData(username: string, tweetId: string): Promise<{
  success: boolean;
  images?: string[];
  error?: string;
}> {
  try {
    // FXTwitter API - 免费公开服务
    const apiUrl = `https://api.fxtwitter.com/${username}/status/${tweetId}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      // 30秒超时
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      // 尝试备用方案：vxtwitter
      return await fetchFromVxTwitter(username, tweetId);
    }
    
    const data = await response.json();
    
    if (data.code !== 200 || !data.tweet) {
      return { success: false, error: '无法获取推文数据' };
    }
    
    const tweet = data.tweet;
    const images: string[] = [];
    
    // 提取图片 URL
    if (tweet.media?.photos) {
      for (const photo of tweet.media.photos) {
        if (photo.url) {
          // 获取最大尺寸的图片
          images.push(photo.url.replace(/\?.*$/, '') + '?format=jpg&name=large');
        }
      }
    }
    
    // 也检查 media.all
    if (tweet.media?.all) {
      for (const media of tweet.media.all) {
        if (media.type === 'photo' && media.url) {
          const imageUrl = media.url.replace(/\?.*$/, '') + '?format=jpg&name=large';
          if (!images.includes(imageUrl)) {
            images.push(imageUrl);
          }
        }
      }
    }
    
    // 从 mosaic 提取
    if (tweet.media?.mosaic?.formats?.jpeg) {
      images.push(tweet.media.mosaic.formats.jpeg);
    }
    
    if (images.length === 0) {
      return { success: false, error: '该推文没有图片' };
    }
    
    return { success: true, images };
  } catch (error) {
    console.error('[X Extract] FXTwitter error:', error);
    // 尝试备用方案
    return await fetchFromVxTwitter(username, tweetId);
  }
}

/**
 * 备用方案：使用 VXTwitter
 */
async function fetchFromVxTwitter(username: string, tweetId: string): Promise<{
  success: boolean;
  images?: string[];
  error?: string;
}> {
  try {
    const apiUrl = `https://api.vxtwitter.com/${username}/status/${tweetId}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      return { success: false, error: `API 请求失败: ${response.status}` };
    }
    
    const data = await response.json();
    const images: string[] = [];
    
    // VXTwitter 的返回格式
    if (data.mediaURLs && Array.isArray(data.mediaURLs)) {
      for (const url of data.mediaURLs) {
        if (typeof url === 'string' && (url.includes('.jpg') || url.includes('.png') || url.includes('pbs.twimg.com'))) {
          images.push(url);
        }
      }
    }
    
    // 也检查 media_extended
    if (data.media_extended && Array.isArray(data.media_extended)) {
      for (const media of data.media_extended) {
        if (media.type === 'image' && media.url) {
          if (!images.includes(media.url)) {
            images.push(media.url);
          }
        }
      }
    }
    
    if (images.length === 0) {
      return { success: false, error: '该推文没有找到图片' };
    }
    
    return { success: true, images };
  } catch (error) {
    console.error('[X Extract] VXTwitter error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '获取推文数据失败' 
    };
  }
}

export async function POST(request: NextRequest) {
  // 需要认证
  const authError = requireAuth(request);
  if (authError) return authError;
  
  try {
    const body = await request.json();
    const { url, promptId, clearNonR2 = true } = body;
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: '缺少 URL 参数' },
        { status: 400 }
      );
    }
    
    // 解析 X URL
    const parsed = parseXUrl(url);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: '无效的 X.com URL，请提供格式如 https://x.com/user/status/123 的链接' },
        { status: 400 }
      );
    }
    
    console.log(`[X Extract] Fetching images from @${parsed.username}/status/${parsed.tweetId}`);
    
    // 获取推文图片
    const tweetResult = await fetchTweetData(parsed.username, parsed.tweetId);
    
    if (!tweetResult.success || !tweetResult.images) {
      return NextResponse.json(
        { success: false, error: tweetResult.error || '获取图片失败' },
        { status: 400 }
      );
    }
    
    console.log(`[X Extract] Found ${tweetResult.images.length} images`);
    
    // 检查 R2 是否配置
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: 'Cloudflare R2 未配置' },
        { status: 500 }
      );
    }
    
    // 上传图片到 R2
    const uploadResults: Array<{ 
      originalUrl: string; 
      r2Url?: string; 
      error?: string;
    }> = [];
    
    for (const imageUrl of tweetResult.images) {
      try {
        console.log(`[X Extract] Uploading: ${imageUrl.substring(0, 80)}...`);
        const result = await uploadImageFromUrl(imageUrl);
        
        if (result.success && result.url) {
          uploadResults.push({
            originalUrl: imageUrl,
            r2Url: result.url,
          });
          
          // 保存到 Image 表
          try {
            await prisma.image.create({
              data: {
                key: result.key!,
                originalUrl: imageUrl,
                url: result.url,
                promptId: promptId || null,
                status: 'active',
              },
            });
          } catch {
            // 数据库保存失败不影响上传结果
          }
        } else {
          uploadResults.push({
            originalUrl: imageUrl,
            error: result.error || '上传失败',
          });
        }
      } catch (error) {
        uploadResults.push({
          originalUrl: imageUrl,
          error: error instanceof Error ? error.message : '上传失败',
        });
      }
    }
    
    // 收集成功上传的 R2 URL
    const r2Urls = uploadResults
      .filter(r => r.r2Url)
      .map(r => r.r2Url!);
    
    const successCount = r2Urls.length;
    const failedCount = uploadResults.length - successCount;
    
    // 如果需要更新 Prompt，获取现有数据并处理
    let updatedPrompt = null;
    if (promptId && r2Urls.length > 0) {
      try {
        const existingPrompt = await prisma.prompt.findUnique({
          where: { id: promptId },
        });
        
        if (existingPrompt) {
          // 获取现有图片
          let existingUrls: string[] = [];
          if (existingPrompt.imageUrls) {
            try {
              existingUrls = JSON.parse(existingPrompt.imageUrls as string);
            } catch {
              existingUrls = [];
            }
          } else if (existingPrompt.imageUrl) {
            existingUrls = [existingPrompt.imageUrl];
          }
          
          // 根据 clearNonR2 决定是否清除非 R2 图片
          let finalUrls: string[];
          if (clearNonR2) {
            // 只保留 R2 图片 + 新上传的
            const r2Only = existingUrls.filter(url => isR2ImageUrl(url));
            finalUrls = [...r2Only, ...r2Urls];
          } else {
            // 保留所有 + 新上传的
            finalUrls = [...existingUrls, ...r2Urls];
          }
          
          // 去重
          finalUrls = [...new Set(finalUrls)];
          
          // 限制最大图片数量
          finalUrls = finalUrls.slice(0, 6);
          
          // 更新 Prompt
          updatedPrompt = await prisma.prompt.update({
            where: { id: promptId },
            data: {
              imageUrl: finalUrls[0] || null,
              imageUrls: JSON.stringify(finalUrls),
              updatedAt: new Date(),
            },
          });
          
          console.log(`[X Extract] Updated prompt ${promptId} with ${finalUrls.length} images`);
        }
      } catch (error) {
        console.error('[X Extract] Failed to update prompt:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        tweetId: parsed.tweetId,
        username: parsed.username,
        totalFound: tweetResult.images.length,
        uploaded: successCount,
        failed: failedCount,
        r2Urls,
        results: uploadResults,
        promptUpdated: !!updatedPrompt,
      },
    });
  } catch (error) {
    console.error('[X Extract] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '提取失败' },
      { status: 500 }
    );
  }
}
