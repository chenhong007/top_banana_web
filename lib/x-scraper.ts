/**
 * X.com (Twitter) Image Scraper
 * 使用第三方服务提取推文图片
 */

export interface XScraperResult {
  success: boolean;
  images: string[];
  error?: string;
  tweetText?: string;
  authorName?: string;
  authorUsername?: string;
}

/**
 * 从 X.com URL 中提取推文 ID
 */
export function extractTweetId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // 支持 x.com 和 twitter.com
    if (!hostname.includes('x.com') && !hostname.includes('twitter.com')) {
      return null;
    }
    
    // 匹配 /status/123456789 格式
    const match = urlObj.pathname.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * 检查 URL 是否是 X.com/Twitter 链接
 */
export function isXUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes('x.com') || hostname.includes('twitter.com');
  } catch {
    return false;
  }
}

/**
 * 使用 fxtwitter API 获取推文数据
 * fxtwitter.com 提供免费的推文数据 API
 */
async function fetchFromFxTwitter(tweetId: string, username: string = 'i'): Promise<XScraperResult> {
  try {
    // fxtwitter API 格式: https://api.fxtwitter.com/{username}/status/{id}
    const apiUrl = `https://api.fxtwitter.com/${username}/status/${tweetId}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`FxTwitter API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.tweet) {
      throw new Error('No tweet data found');
    }

    const tweet = data.tweet;
    const images: string[] = [];

    // 提取媒体图片
    if (tweet.media?.photos) {
      for (const photo of tweet.media.photos) {
        if (photo.url) {
          images.push(photo.url);
        }
      }
    }

    // 如果有视频，尝试获取缩略图
    if (tweet.media?.videos) {
      for (const video of tweet.media.videos) {
        if (video.thumbnail_url) {
          images.push(video.thumbnail_url);
        }
      }
    }

    // 如果没有媒体但有预览卡片
    if (images.length === 0 && tweet.media?.external?.thumbnail_url) {
      images.push(tweet.media.external.thumbnail_url);
    }

    return {
      success: true,
      images,
      tweetText: tweet.text,
      authorName: tweet.author?.name,
      authorUsername: tweet.author?.screen_name,
    };
  } catch (error) {
    console.error('[X-Scraper] FxTwitter error:', error);
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : 'Failed to fetch from FxTwitter',
    };
  }
}

/**
 * 使用 vxtwitter API 作为备用
 */
async function fetchFromVxTwitter(tweetId: string, username: string = 'i'): Promise<XScraperResult> {
  try {
    // vxtwitter API 格式类似
    const apiUrl = `https://api.vxtwitter.com/${username}/status/${tweetId}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`VxTwitter API returned ${response.status}`);
    }

    const data = await response.json();
    const images: string[] = [];

    // 提取媒体
    if (data.media_extended) {
      for (const media of data.media_extended) {
        if (media.type === 'image' && media.url) {
          images.push(media.url);
        } else if (media.type === 'video' && media.thumbnail_url) {
          images.push(media.thumbnail_url);
        }
      }
    }

    // 备用：从 mediaURLs 提取
    if (images.length === 0 && data.mediaURLs) {
      for (const url of data.mediaURLs) {
        if (typeof url === 'string') {
          images.push(url);
        }
      }
    }

    return {
      success: true,
      images,
      tweetText: data.text,
      authorName: data.user_name,
      authorUsername: data.user_screen_name,
    };
  } catch (error) {
    console.error('[X-Scraper] VxTwitter error:', error);
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : 'Failed to fetch from VxTwitter',
    };
  }
}

/**
 * 尝试直接从页面 meta 标签获取图片（作为最后备用）
 */
async function fetchFromOEmbed(url: string): Promise<XScraperResult> {
  try {
    // Twitter publish API
    const embedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
    
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`oEmbed API returned ${response.status}`);
    }

    const data = await response.json();
    const images: string[] = [];

    // 从 HTML 中提取图片 URL
    if (data.html) {
      const imgMatches = data.html.match(/https:\/\/pbs\.twimg\.com\/media\/[^"'\s]+/g);
      if (imgMatches) {
        images.push(...imgMatches);
      }
    }

    return {
      success: images.length > 0,
      images,
      authorName: data.author_name,
      authorUsername: data.author_url?.split('/').pop(),
      error: images.length === 0 ? 'No images found in oEmbed response' : undefined,
    };
  } catch (error) {
    console.error('[X-Scraper] oEmbed error:', error);
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : 'Failed to fetch from oEmbed',
    };
  }
}

/**
 * 从 X.com URL 中提取用户名
 */
function extractUsername(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    return pathParts[0] || 'i';
  } catch {
    return 'i';
  }
}

/**
 * 主函数：从 X.com URL 提取图片
 * 依次尝试多个 API 直到成功
 */
export async function scrapeXImages(url: string): Promise<XScraperResult> {
  const tweetId = extractTweetId(url);
  
  if (!tweetId) {
    return {
      success: false,
      images: [],
      error: 'Invalid X.com URL: Could not extract tweet ID',
    };
  }

  const username = extractUsername(url);
  console.log(`[X-Scraper] Extracting images from tweet ${tweetId} by @${username}`);

  // 1. 首先尝试 FxTwitter（通常最可靠）
  const fxResult = await fetchFromFxTwitter(tweetId, username);
  if (fxResult.success && fxResult.images.length > 0) {
    console.log(`[X-Scraper] FxTwitter success: found ${fxResult.images.length} images`);
    return fxResult;
  }

  // 2. 尝试 VxTwitter
  const vxResult = await fetchFromVxTwitter(tweetId, username);
  if (vxResult.success && vxResult.images.length > 0) {
    console.log(`[X-Scraper] VxTwitter success: found ${vxResult.images.length} images`);
    return vxResult;
  }

  // 3. 尝试 oEmbed
  const oembedResult = await fetchFromOEmbed(url);
  if (oembedResult.success && oembedResult.images.length > 0) {
    console.log(`[X-Scraper] oEmbed success: found ${oembedResult.images.length} images`);
    return oembedResult;
  }

  // 所有方法都失败
  console.log('[X-Scraper] All methods failed to extract images');
  return {
    success: false,
    images: [],
    error: '无法从该推文提取图片。可能是推文不包含图片，或者推文已被删除/设为私密。',
  };
}

/**
 * 获取最佳质量的图片 URL
 * Twitter 图片 URL 可以通过参数调整质量
 */
export function getHighQualityImageUrl(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    
    // Twitter 图片通常支持 ?format=jpg&name=large 或 ?name=orig
    if (url.hostname.includes('twimg.com')) {
      // 移除现有的 name 参数
      url.searchParams.delete('name');
      // 设置为原始质量
      url.searchParams.set('name', 'orig');
      return url.toString();
    }
    
    return imageUrl;
  } catch {
    return imageUrl;
  }
}
