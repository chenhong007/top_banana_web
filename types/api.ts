/**
 * API request and response type definitions
 * 
 * This is the single source of truth for API-related types.
 * All other modules should import from this file via @/types
 */

/**
 * Standard API response type
 * Used for all API endpoints to maintain consistent response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Create prompt input type
 * Used for creating new prompts via API and repository layer
 */
export interface CreatePromptInput {
  effect: string;
  description: string;
  tags: string[];
  modelTags?: string[]; // AI模型标签名称列表
  prompt: string;
  source: string;
  imageUrl?: string; // 单图 URL (向后兼容)
  imageUrls?: string[]; // 多图 URL 数组 (新增支持多图)
  category?: string; // 生成类型 (optional, defaults to '文生图')
  createdAt?: string; // ISO date string, optional for import with custom date
}

/**
 * Update prompt input type
 * All fields are optional for partial updates
 */
export interface UpdatePromptInput extends Partial<CreatePromptInput> {}

/**
 * Create prompt request type (alias for API layer)
 * @deprecated Use CreatePromptInput instead
 */
export interface CreatePromptRequest extends CreatePromptInput {}

/**
 * Update prompt request type (for API layer)
 */
export interface UpdatePromptRequest extends Partial<CreatePromptRequest> {
  id: string;
}
