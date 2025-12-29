/**
 * Prompt Repository
 * Handles all database operations for Prompt model
 */

import { Prompt, Tag, Category, ModelTag } from '@prisma/client';
import { BaseRepository, PaginatedResult, PaginationOptions, calculatePagination } from './base.repository';
import { DEFAULT_CATEGORY } from '@/lib/constants';
import { normalizeImageUrls } from '@/lib/image-utils';
import type { CreatePromptInput, UpdatePromptInput } from '@/types';

// Re-export types for backward compatibility
export type { CreatePromptInput, UpdatePromptInput };

// Full Prompt with relations from Prisma
type PromptWithRelations = Prompt & {
  tags: Tag[];
  category: Category | null;
  modelTags: ModelTag[];
};

// DTO for API responses
export interface PromptDTO {
  id: string;
  effect: string;
  description: string;
  tags: string[];
  modelTags: string[];
  prompt: string;
  source: string;
  imageUrl?: string; // 第一张图作为封面（向后兼容）
  imageUrls?: string[]; // 所有图片 URL 数组
  category?: string;
  likes: number;
  hearts: number;
  createdAt: string;
  updatedAt: string;
}

class PromptRepository extends BaseRepository<
  PromptWithRelations,
  CreatePromptInput,
  UpdatePromptInput,
  PromptDTO
> {
  /**
   * Convert Prisma model to DTO
   */
  protected toDTO(prompt: PromptWithRelations): PromptDTO {
    // 使用统一的图片处理工具函数
    const { primaryImageUrl, imageUrls } = normalizeImageUrls(
      prompt.imageUrl,
      (prompt as { imageUrls?: string[] }).imageUrls
    );
    
    return {
      id: prompt.id,
      effect: prompt.effect,
      description: prompt.description,
      tags: prompt.tags.map((t) => t.name),
      modelTags: prompt.modelTags.map((m) => m.name),
      prompt: prompt.prompt,
      source: prompt.source,
      imageUrl: primaryImageUrl,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      category: prompt.category?.name || undefined,
      likes: prompt.likes || 0,
      hearts: prompt.hearts || 0,
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString(),
    };
  }

  /**
   * Increment likes count
   */
  async incrementLikes(id: string): Promise<PromptDTO | null> {
    try {
      const prompt = await this.prisma.prompt.update({
        where: { id },
        data: { likes: { increment: 1 } },
        include: { tags: true, category: true, modelTags: true },
      });
      return this.toDTO(prompt);
    } catch (error) {
      console.error('Error incrementing likes:', error);
      return null;
    }
  }

  /**
   * Increment hearts count (copies)
   */
  async incrementHearts(id: string): Promise<PromptDTO | null> {
    try {
      const prompt = await this.prisma.prompt.update({
        where: { id },
        data: { hearts: { increment: 1 } },
        include: { tags: true, category: true, modelTags: true },
      });
      return this.toDTO(prompt);
    } catch (error) {
      console.error('Error incrementing hearts:', error);
      return null;
    }
  }

  /**
   * Find all prompts
   */
  async findAll(): Promise<PromptDTO[]> {
    try {
      const prompts = await this.prisma.prompt.findMany({
        include: { tags: true, category: true, modelTags: true },
        orderBy: { createdAt: 'desc' },
      });

      return prompts.map((p) => this.toDTO(p));
    } catch (error) {
      this.handleError(error, 'PromptRepository.findAll');
    }
  }

  /**
   * Find prompts with pagination
   */
  async findPaginated(options: PaginationOptions): Promise<PaginatedResult<PromptDTO>> {
    try {
      const total = await this.prisma.prompt.count();
      const { skip, take, page, pageSize, totalPages } = calculatePagination(options, total);

      const prompts = await this.prisma.prompt.findMany({
        include: { tags: true, category: true, modelTags: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      return {
        data: prompts.map((p) => this.toDTO(p)),
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      this.handleError(error, 'PromptRepository.findPaginated');
    }
  }

  /**
   * Find all prompts with pagination (convenience method)
   */
  async findAllPaginated(page: number, pageSize: number): Promise<PaginatedResult<PromptDTO>> {
    return this.findPaginated({ page, pageSize });
  }

  /**
   * Find a single prompt by ID
   */
  async findById(id: string): Promise<PromptDTO | null> {
    try {
      const prompt = await this.prisma.prompt.findUnique({
        where: { id },
        include: { tags: true, category: true, modelTags: true },
      });

      return prompt ? this.toDTO(prompt) : null;
    } catch (error) {
      this.handleError(error, 'PromptRepository.findById');
    }
  }

  /**
   * Create a new prompt
   */
  async create(data: CreatePromptInput): Promise<PromptDTO> {
    try {
      const categoryName = data.category || DEFAULT_CATEGORY;
      
      // 使用统一的图片处理工具函数
      const { primaryImageUrl, imageUrls } = normalizeImageUrls(data.imageUrl, data.imageUrls);

      const prompt = await this.prisma.prompt.create({
        data: {
          effect: data.effect,
          description: data.description,
          prompt: data.prompt,
          source: data.source,
          imageUrl: primaryImageUrl || null,
          imageUrls: imageUrls,
          tags: {
            connectOrCreate: data.tags.map((name) => ({
              where: { name },
              create: { name },
            })),
          },
          modelTags:
            data.modelTags && data.modelTags.length > 0
              ? {
                  connectOrCreate: data.modelTags.map((name) => ({
                    where: { name },
                    create: { name },
                  })),
                }
              : undefined,
          category: {
            connectOrCreate: {
              where: { name: categoryName },
              create: { name: categoryName },
            },
          },
        },
        include: { tags: true, category: true, modelTags: true },
      });

      return this.toDTO(prompt);
    } catch (error) {
      this.handleError(error, 'PromptRepository.create');
    }
  }

  /**
   * Update an existing prompt
   */
  async update(id: string, data: UpdatePromptInput): Promise<PromptDTO | null> {
    try {
      // First disconnect existing tags/modelTags if they are being updated
      if (data.tags || data.modelTags) {
        await this.prisma.prompt.update({
          where: { id },
          data: {
            ...(data.tags && { tags: { set: [] } }),
            ...(data.modelTags && { modelTags: { set: [] } }),
          },
        });
      }

      // 处理图片更新：使用统一的图片处理工具函数
      let imageUpdateData: { imageUrl?: string | null; imageUrls?: string[] } = {};
      if (data.imageUrls !== undefined || data.imageUrl !== undefined) {
        const { primaryImageUrl, imageUrls } = normalizeImageUrls(data.imageUrl, data.imageUrls);
        imageUpdateData.imageUrl = primaryImageUrl || null;
        imageUpdateData.imageUrls = imageUrls;
      }

      const prompt = await this.prisma.prompt.update({
        where: { id },
        data: {
          ...(data.effect !== undefined && { effect: data.effect }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.prompt !== undefined && { prompt: data.prompt }),
          ...(data.source !== undefined && { source: data.source }),
          ...imageUpdateData,
          ...(data.tags && {
            tags: {
              connectOrCreate: data.tags.map((name) => ({
                where: { name },
                create: { name },
              })),
            },
          }),
          ...(data.modelTags && {
            modelTags: {
              connectOrCreate: data.modelTags.map((name) => ({
                where: { name },
                create: { name },
              })),
            },
          }),
          ...(data.category !== undefined && {
            category: {
              connectOrCreate: {
                where: { name: data.category },
                create: { name: data.category },
              },
            },
          }),
        },
        include: { tags: true, category: true, modelTags: true },
      });

      return this.toDTO(prompt);
    } catch (error) {
      console.error('Error updating prompt:', error);
      return null;
    }
  }

  /**
   * Delete a prompt by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.prompt.delete({ where: { id } });
      return true;
    } catch (error) {
      console.error('Error deleting prompt:', error);
      return false;
    }
  }

  /**
   * Bulk create prompts (optimized with batch processing)
   * Uses smaller batches to avoid transaction timeout issues
   */
  async bulkCreate(items: CreatePromptInput[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // 分批处理，每批最多 50 条，避免事务超时
    const BATCH_SIZE = 50;
    const batches: CreatePromptInput[][] = [];
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
    }

    // 逐批处理
    for (const batch of batches) {
      try {
        // 每批使用独立的事务，设置 120 秒超时
        await this.withTransaction(async (tx) => {
          for (const item of batch) {
            try {
              const categoryName = item.category || DEFAULT_CATEGORY;
              
              // 使用统一的图片处理工具函数
              const { primaryImageUrl, imageUrls } = normalizeImageUrls(item.imageUrl, item.imageUrls);

              await tx.prompt.create({
                data: {
                  effect: item.effect,
                  description: item.description,
                  prompt: item.prompt,
                  source: item.source,
                  imageUrl: primaryImageUrl || null,
                  imageUrls: imageUrls,
                  tags: {
                    connectOrCreate: item.tags.map((name) => ({
                      where: { name },
                      create: { name },
                    })),
                  },
                  modelTags:
                    item.modelTags && item.modelTags.length > 0
                      ? {
                          connectOrCreate: item.modelTags.map((name) => ({
                            where: { name },
                            create: { name },
                          })),
                        }
                      : undefined,
                  category: {
                    connectOrCreate: {
                      where: { name: categoryName },
                      create: { name: categoryName },
                    },
                  },
                },
              });
              success++;
            } catch (error) {
              console.error(`Failed to import prompt "${item.effect}":`, error);
              failed++;
            }
          }
        }, { timeout: 120000 }); // 120 秒超时
      } catch (batchError) {
        // 如果整批事务失败，记录失败数量
        console.error(`Batch transaction failed:`, batchError);
        failed += batch.length;
      }
    }

    return { success, failed };
  }

  /**
   * Count total prompts
   */
  async count(): Promise<number> {
    try {
      return await this.prisma.prompt.count();
    } catch (error) {
      this.handleError(error, 'PromptRepository.count');
    }
  }

  /**
   * Get prompts by tag name
   */
  async findByTag(tagName: string): Promise<PromptDTO[]> {
    try {
      const prompts = await this.prisma.prompt.findMany({
        where: {
          tags: {
            some: { name: tagName },
          },
        },
        include: { tags: true, category: true, modelTags: true },
        orderBy: { createdAt: 'desc' },
      });

      return prompts.map((p) => this.toDTO(p));
    } catch (error) {
      this.handleError(error, 'PromptRepository.findByTag');
    }
  }

  /**
   * Get prompts by category name
   */
  async findByCategory(categoryName: string): Promise<PromptDTO[]> {
    try {
      const prompts = await this.prisma.prompt.findMany({
        where: {
          category: { name: categoryName },
        },
        include: { tags: true, category: true, modelTags: true },
        orderBy: { createdAt: 'desc' },
      });

      return prompts.map((p) => this.toDTO(p));
    } catch (error) {
      this.handleError(error, 'PromptRepository.findByCategory');
    }
  }

  /**
   * Get prompts by model tag name
   */
  async findByModelTag(modelTagName: string): Promise<PromptDTO[]> {
    try {
      const prompts = await this.prisma.prompt.findMany({
        where: {
          modelTags: {
            some: { name: modelTagName },
          },
        },
        include: { tags: true, category: true, modelTags: true },
        orderBy: { createdAt: 'desc' },
      });

      return prompts.map((p) => this.toDTO(p));
    } catch (error) {
      this.handleError(error, 'PromptRepository.findByModelTag');
    }
  }

  // ==================== Duplicate Detection Methods ====================

  /**
   * Find prompts by primary image URL (first image in imageUrls array or legacy imageUrl)
   * Used for duplicate detection
   */
  async findByImageUrl(imageUrl: string): Promise<{ id: string; effect: string } | null> {
    if (!imageUrl || imageUrl.trim() === '') {
      return null;
    }

    try {
      // Check both imageUrl (legacy) and imageUrls array (first element)
      const prompt = await this.prisma.prompt.findFirst({
        where: {
          OR: [
            { imageUrl: imageUrl },
            { imageUrls: { has: imageUrl } },
          ],
        },
        select: { id: true, effect: true },
      });

      return prompt;
    } catch (error) {
      console.error('Error finding prompt by imageUrl:', error);
      return null;
    }
  }

  /**
   * Find prompts by source URL
   * Used for duplicate detection
   */
  async findBySource(source: string): Promise<{ id: string; effect: string } | null> {
    if (!source || source.trim() === '' || source === 'unknown') {
      return null;
    }

    try {
      const prompt = await this.prisma.prompt.findFirst({
        where: { source: source },
        select: { id: true, effect: true },
      });

      return prompt;
    } catch (error) {
      console.error('Error finding prompt by source:', error);
      return null;
    }
  }

  /**
   * Find prompts by exact effect (title) match
   * Used for duplicate detection
   */
  async findByEffect(effect: string): Promise<{ id: string; effect: string } | null> {
    if (!effect || effect.trim() === '') {
      return null;
    }

    try {
      const prompt = await this.prisma.prompt.findFirst({
        where: { effect: effect },
        select: { id: true, effect: true },
      });

      return prompt;
    } catch (error) {
      console.error('Error finding prompt by effect:', error);
      return null;
    }
  }

  /**
   * Get all prompts with only id and prompt fields for similarity checking
   * Optimized for memory efficiency - only fetches necessary fields
   */
  async findAllForSimilarityCheck(): Promise<Array<{ id: string; prompt: string }>> {
    try {
      const prompts = await this.prisma.prompt.findMany({
        select: { id: true, prompt: true },
      });

      return prompts;
    } catch (error) {
      console.error('Error fetching prompts for similarity check:', error);
      return [];
    }
  }
}

// Export singleton instance
export const promptRepository = new PromptRepository();

