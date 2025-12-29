/**
 * Repositories Module
 * Re-exports all repository instances and types
 */

// Base repository
export { BaseRepository, calculatePagination } from './base.repository';
export type { PaginatedResult, PaginationOptions } from './base.repository';

// Prompt repository
export { promptRepository } from './prompt.repository';
export type { PromptDTO } from './prompt.repository';

// Re-export CreatePromptInput and UpdatePromptInput from types (single source of truth)
export type { CreatePromptInput, UpdatePromptInput } from '@/types';

// Tag repository
export { tagRepository } from './tag.repository';
export type { TagDTO } from './tag.repository';

// Category repository
export { categoryRepository } from './category.repository';
export type { CategoryDTO } from './category.repository';

// ModelTag repository
export { modelTagRepository } from './model-tag.repository';
export type { ModelTagDTO, CreateModelTagInput } from './model-tag.repository';

// Image repository
export { imageRepository, ImageStatus } from './image.repository';
export type { ImageDTO, CreateImageInput, UpdateImageInput } from './image.repository';
