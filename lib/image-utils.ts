/**
 * Image URL Utility Functions
 * Provides unified handling for imageUrl/imageUrls backward compatibility
 */

/**
 * Result of normalizing image URLs
 */
export interface NormalizedImageUrls {
  /** Primary image URL (first image or undefined) */
  primaryImageUrl: string | undefined;
  /** Array of all image URLs */
  imageUrls: string[];
}

/**
 * Normalize imageUrl and imageUrls for backward compatibility
 * 
 * Priority:
 * 1. If imageUrls array exists and has items, use it
 * 2. Otherwise, fall back to single imageUrl
 * 
 * @param imageUrl - Legacy single image URL field
 * @param imageUrls - New multiple image URLs field
 * @returns Normalized object with primaryImageUrl and imageUrls array
 * 
 * @example
 * // New format with imageUrls
 * normalizeImageUrls(undefined, ['url1', 'url2'])
 * // => { primaryImageUrl: 'url1', imageUrls: ['url1', 'url2'] }
 * 
 * @example
 * // Legacy format with only imageUrl
 * normalizeImageUrls('old-url', undefined)
 * // => { primaryImageUrl: 'old-url', imageUrls: ['old-url'] }
 * 
 * @example
 * // Both provided (imageUrls takes priority)
 * normalizeImageUrls('old-url', ['new-url1', 'new-url2'])
 * // => { primaryImageUrl: 'new-url1', imageUrls: ['new-url1', 'new-url2'] }
 * 
 * @example
 * // Empty/no images
 * normalizeImageUrls(undefined, [])
 * // => { primaryImageUrl: undefined, imageUrls: [] }
 */
export function normalizeImageUrls(
  imageUrl: string | string[] | null | undefined,
  imageUrls: string[] | null | undefined
): NormalizedImageUrls {
  // 收集所有有效的图片URL
  const allUrls: string[] = [];
  
  // 1. 处理 imageUrls 数组
  if (Array.isArray(imageUrls)) {
    for (const url of imageUrls) {
      if (typeof url === 'string' && url.trim()) {
        allUrls.push(url.trim());
      }
    }
  }
  
  // 2. 处理 imageUrl（可能是字符串或数组）
  if (Array.isArray(imageUrl)) {
    // imageUrl 是数组的情况
    for (const url of imageUrl) {
      if (typeof url === 'string' && url.trim() && !allUrls.includes(url.trim())) {
        allUrls.push(url.trim());
      }
    }
  } else if (typeof imageUrl === 'string' && imageUrl.trim()) {
    // imageUrl 是字符串的情况，添加到开头
    if (!allUrls.includes(imageUrl.trim())) {
      allUrls.unshift(imageUrl.trim());
    }
  }

  // 返回结果
  if (allUrls.length > 0) {
    return {
      primaryImageUrl: allUrls[0],
      imageUrls: allUrls,
    };
  }

  // No images
  return {
    primaryImageUrl: undefined,
    imageUrls: [],
  };
}

/**
 * Get the primary image URL from imageUrl/imageUrls
 * 
 * @param imageUrl - Legacy single image URL field
 * @param imageUrls - New multiple image URLs field
 * @returns Primary image URL or undefined
 */
export function getPrimaryImageUrl(
  imageUrl: string | string[] | null | undefined,
  imageUrls: string[] | null | undefined
): string | undefined {
  return normalizeImageUrls(imageUrl, imageUrls).primaryImageUrl;
}

/**
 * Get the image URLs array from imageUrl/imageUrls
 * 
 * @param imageUrl - Legacy single image URL field
 * @param imageUrls - New multiple image URLs field
 * @returns Array of image URLs (may be empty)
 */
export function getImageUrlsArray(
  imageUrl: string | string[] | null | undefined,
  imageUrls: string[] | null | undefined
): string[] {
  return normalizeImageUrls(imageUrl, imageUrls).imageUrls;
}

/**
 * Create form data with backward compatible image fields
 * Ensures both imageUrl and imageUrls are set correctly for database compatibility
 * 
 * @param urls - Array of image URLs
 * @returns Object with both imageUrl and imageUrls fields
 */
export function createImageFields(urls: string[]): {
  imageUrl: string;
  imageUrls: string[];
} {
  return {
    imageUrl: urls.length > 0 ? urls[0] : '',
    imageUrls: urls,
  };
}
