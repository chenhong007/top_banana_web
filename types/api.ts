/**
 * API request and response type definitions
 */

export interface CreatePromptRequest {
  effect: string;
  description: string;
  tags: string[];
  modelTags?: string[]; // AI模型标签名称列表
  prompt: string;
  source: string;
  imageUrl?: string; // 单图 URL (向后兼容)
  imageUrls?: string[]; // 多图 URL 数组 (新增支持多图)
  category?: string; // 生成类型 (optional, defaults to '文生图')
}

export interface UpdatePromptRequest extends Partial<CreatePromptRequest> {
  id: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

