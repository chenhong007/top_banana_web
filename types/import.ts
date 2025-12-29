/**
 * Import-related type definitions
 * 
 * 统一导入字段映射规则：
 * - title/标题 → effect (标题) - 必填
 * - description/描述 → description (描述) - 可选
 * - prompt/提示词 → prompt (提示词) - 必填
 * - source/来源 → source (来源) - 可选
 * - tags/标签 → tags (标签数组) - 可选，支持多个标签
 * - imageUrl/图片 → imageUrl (主图片) - 可选
 * - imageUrls/图片列表 → imageUrls (图片数组) - 可选，支持多个图片
 * - modelTags/模型标签 → modelTags (模型标签数组) - 可选，默认: ['Banana']
 * - category/生成类型 → category (生成类型) - 可选，默认: '文生图'
 */

// Import data mode: merge with existing data or replace all
export type DataImportMode = 'merge' | 'replace';

// Import source type: CSV, Feishu, or JSON
export type ImportSourceType = 'csv' | 'feishu' | 'json';

/**
 * 统一的导入数据项接口
 * 支持中英文字段名
 */
export interface ImportItem {
  // 标题字段 (必填)
  title?: string;
  标题?: string;
  effect?: string;
  效果?: string;
  
  // 描述字段 (可选)
  description?: string;
  描述?: string;
  desc?: string;
  
  // 提示词字段 (必填)
  prompt?: string;
  提示词?: string;
  content?: string;
  
  // 来源字段 (可选)
  source?: string;
  来源?: string;
  提示词来源?: string;
  link?: string;
  
  // 标签字段 (可选)
  tags?: string | string[];
  标签?: string | string[];
  评测对象?: string | string[];
  场景标签?: string | string[];
  
  // 图片字段 (可选)
  imageUrl?: string | string[];
  图片?: string | string[];
  image?: string;
  preview?: string;
  
  // 图片列表字段 (可选)
  imageUrls?: string[];
  图片列表?: string[];
  
  // 模型标签字段 (可选，默认: ['Banana'])
  modelTags?: string | string[];
  模型标签?: string | string[];
  AI模型?: string | string[];
  模型?: string | string[];
  
  // 生成类型字段 (可选，默认: '文生图')
  category?: string | string[];
  生成类型?: string | string[];
  类别?: string | string[];
  分类?: string | string[];
}

/**
 * 标准化后的导入数据项
 */
export interface NormalizedImportItem {
  effect: string;           // 标题 (必填)
  description: string;      // 描述
  prompt: string;           // 提示词 (必填)
  source: string;           // 来源
  tags: string[];           // 标签数组 - 支持多个标签
  imageUrl?: string;        // 主图片 (通常是 imageUrls[0])
  imageUrls?: string[];     // 图片数组 - 支持多个图片
  modelTags: string[];      // 模型标签数组 (默认: ['Banana'])
  category: string;         // 生成类型 (默认: '文生图')
}

export interface ImportResult {
  imported: number;
  total: number;
  skipped?: number;
  failed?: number;
  mode?: string;
}

// 默认值常量
export const IMPORT_DEFAULTS = {
  MODEL_TAG: 'Banana',
  CATEGORY: '文生图',
} as const;
