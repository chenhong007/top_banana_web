/**
 * Image related type definitions
 */

// 图片上传结果
export interface ImageUploadResult {
  id: string;
  key: string;
  url: string;
  originalUrl?: string;
  fileName?: string;
  size?: number;
}

// 图片信息
export interface ImageInfo {
  id: string;
  key: string;
  url: string;
  originalUrl?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  promptId?: string;
  status: 'active' | 'deleted' | 'pending';
  createdAt: string;
  updatedAt?: string;
}

// R2 图片信息（直接从 R2 获取）
export interface R2ImageInfo {
  key: string;
  url: string;
  size?: number;
  lastModified?: Date;
}

// 迁移结果
export interface MigrationResult {
  promptId: string;
  effect: string;
  originalUrl: string;
  newUrl?: string;
  error?: string;
}

// 迁移状态
export interface MigrationStatus {
  total: number;
  migrated: number;
  pending: number;
  localImages: number;
  r2Configured: boolean;
}

// 批量上传结果
export interface BatchUploadResult {
  total: number;
  success: number;
  failed: number;
  results: Array<{
    originalUrl: string;
    newUrl?: string;
    error?: string;
  }>;
}

