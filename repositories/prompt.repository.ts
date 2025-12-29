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
   * v2.0: 改进事务处理，逐条插入避免事务回滚导致的批量失败
   */
  async bulkCreate(items: CreatePromptInput[]): Promise<{ 
    success: number; 
    failed: number;
    failedItems?: Array<{ index: number; effect: string; error: string }>;
  }> {
    let success = 0;
    let failed = 0;
    const failedItems: Array<{ index: number; effect: string; error: string }> = [];

    // 分批处理，每批最多 50 条
    const BATCH_SIZE = 50;
    const batches: Array<{ items: CreatePromptInput[]; startIndex: number }> = [];
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push({
        items: items.slice(i, i + BATCH_SIZE),
        startIndex: i,
      });
    }

    console.log(`[BulkCreate] Starting import: ${items.length} items in ${batches.length} batches`);

    // 逐批处理
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartTime = Date.now();
      let batchSuccess = 0;
      let batchFailed = 0;

      // 逐条插入，不使用事务，避免单条失败导致整批回滚
      for (let i = 0; i < batch.items.length; i++) {
        const item = batch.items[i];
        const globalIndex = batch.startIndex + i;

        try {
          const categoryName = item.category || DEFAULT_CATEGORY;
          
          // 使用统一的图片处理工具函数
          const { primaryImageUrl, imageUrls } = normalizeImageUrls(item.imageUrl, item.imageUrls);

          await this.prisma.prompt.create({
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
          batchSuccess++;
        } catch (error) {
          failed++;
          batchFailed++;
          
          // 提取详细的错误信息
          const errorMessage = this.extractErrorMessage(error);
          const errorDetail = {
            index: globalIndex,
            effect: item.effect?.substring(0, 50) || '(无标题)',
            error: errorMessage,
          };
          
          failedItems.push(errorDetail);
          
          // 只记录前10条详细错误，避免日志过多
          if (failedItems.length <= 10) {
            console.error(`[BulkCreate] Failed item #${globalIndex}:`, {
              effect: item.effect?.substring(0, 30),
              source: item.source?.substring(0, 50),
              error: errorMessage,
            });
          }
        }
      }

      const batchDuration = Date.now() - batchStartTime;
      console.log(`[BulkCreate] Batch ${batchIndex + 1}/${batches.length}: ${batchSuccess} success, ${batchFailed} failed (${batchDuration}ms)`);
    }

    // 汇总失败原因
    if (failedItems.length > 0) {
      const errorSummary = this.summarizeErrors(failedItems);
      console.error(`[BulkCreate] Import completed with errors:`, {
        total: items.length,
        success,
        failed,
        errorSummary,
        sampleErrors: failedItems.slice(0, 5),
      });
    } else {
      console.log(`[BulkCreate] Import completed successfully: ${success} items`);
    }

    return { 
      success, 
      failed,
      failedItems: failedItems.length > 0 ? failedItems.slice(0, 100) : undefined, // 最多返回100条失败记录
    };
  }

  /**
   * 提取错误信息
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      // Prisma 错误通常有 code 属性
      const prismaError = error as Error & { code?: string; meta?: Record<string, unknown> };
      
      if (prismaError.code) {
        switch (prismaError.code) {
          case 'P2002':
            return `唯一约束冲突: ${JSON.stringify(prismaError.meta?.target || 'unknown')}`;
          case 'P2003':
            return `外键约束失败: ${JSON.stringify(prismaError.meta?.field_name || 'unknown')}`;
          case 'P2025':
            return '记录不存在';
          case 'P2024':
            return '数据库连接超时';
          default:
            return `Prisma错误[${prismaError.code}]: ${error.message.substring(0, 100)}`;
        }
      }
      return error.message.substring(0, 200);
    }
    return String(error).substring(0, 200);
  }

  /**
   * 汇总错误类型
   */
  private summarizeErrors(failedItems: Array<{ error: string }>): Record<string, number> {
    const summary: Record<string, number> = {};
    
    for (const item of failedItems) {
      // 提取错误类型（取第一个冒号前的部分，或整个错误信息的前30个字符）
      const errorType = item.error.includes(':') 
        ? item.error.split(':')[0] 
        : item.error.substring(0, 30);
      
      summary[errorType] = (summary[errorType] || 0) + 1;
    }
    
    return summary;
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

