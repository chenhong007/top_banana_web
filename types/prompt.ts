/**
 * Prompt-related type definitions
 */

export interface PromptItem {
  id: string;
  effect: string; // Effect description
  description: string; // Detailed description
  tags: string[]; // 场景/用途标签
  modelTags?: string[]; // AI模型标签（Midjourney、DALL-E等）
  prompt: string; // The prompt content
  source: string; // Prompt source
  imageUrl?: string; // Optional image URL
  category?: string; // 生成类型类别 (文生图、文生视频、文生音频、其他)
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * AI模型标签详细信息
 */
export interface ModelTagItem {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  type?: string; // 文生图/文生视频/文生音频/多模态/其他
}

