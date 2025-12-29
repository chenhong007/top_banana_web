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
  imageUrl: string | null | undefined,
  imageUrls: string[] | null | undefined
): NormalizedImageUrls {
  // Prioritize imageUrls array if it exists and has items
  if (imageUrls && imageUrls.length > 0) {
    return {
      primaryImageUrl: imageUrls[0],
      imageUrls: imageUrls,
    };
  }

  // Fall back to imageUrl if provided
  if (imageUrl) {
    return {
      primaryImageUrl: imageUrl,
      imageUrls: [imageUrl],
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
  imageUrl: string | null | undefined,
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
  imageUrl: string | null | undefined,
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
