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
   * Find prompts with pagination and missing type filter
   * @param options Pagination options
   * @param missingType Type of missing data to filter by
   */
  async findPaginatedWithMissingFilter(
    options: PaginationOptions, 
    missingType?: string
  ): Promise<PaginatedResult<PromptDTO>> {
    try {
      // 获取所有符合条件的 prompts
      const allPrompts = await this.prisma.prompt.findMany({
        include: { tags: true, category: true, modelTags: true },
        orderBy: { createdAt: 'desc' },
      });

      // 根据缺失类型过滤
      let filteredPrompts = allPrompts;
      if (missingType) {
        filteredPrompts = allPrompts.filter(prompt => {
          const imageUrl = prompt.imageUrl;
          const imageUrls = (prompt as { imageUrls?: string[] }).imageUrls;
          
          switch (missingType) {
            case 'noImage':
              // 没有任何图片
              return !imageUrl && (!imageUrls || imageUrls.length === 0);
            case 'nonR2Image':
              // 有图片但不是 R2 图片
              return this.hasNonR2Images(imageUrl, imageUrls);
            case 'noTags':
              return !prompt.tags || prompt.tags.length === 0;
            case 'noModelTags':
              return !prompt.modelTags || prompt.modelTags.length === 0;
            case 'noDescription':
              return !prompt.description || prompt.description.trim() === '';
            case 'noSource':
              return !prompt.source || prompt.source.trim() === '' || prompt.source === 'unknown';
            case 'noCategory':
              return !prompt.category;
            case 'complete':
              // 完整数据
              return this.isCompletePrompt(prompt);
            default:
              return true;
          }
        });
      }

      const total = filteredPrompts.length;
      const { skip, take, page, pageSize, totalPages } = calculatePagination(options, total);

      // 手动分页
      const paginatedPrompts = filteredPrompts.slice(skip, skip + take);

      return {
        data: paginatedPrompts.map((p) => this.toDTO(p)),
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      this.handleError(error, 'PromptRepository.findPaginatedWithMissingFilter');
    }
  }

  /**
   * 检查图片是否是 R2 图片
   */
  private isR2ImageUrl(url: string): boolean {
    if (!url) return false;
    const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';
    if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
      return true;
    }
    if (url.includes('/api/images/')) {
      return true;
    }
    return false;
  }

  /**
   * 检查是否有非 R2 的图片
   */
  private hasNonR2Images(imageUrl: string | null, imageUrls?: string[]): boolean {
    if (imageUrl && imageUrl.trim() !== '' && !this.isR2ImageUrl(imageUrl)) {
      return true;
    }
    if (imageUrls && Array.isArray(imageUrls)) {
      return imageUrls.some(url => url && url.trim() !== '' && !this.isR2ImageUrl(url));
    }
    return false;
  }

  /**
   * 检查 prompt 是否完整
   */
  private isCompletePrompt(prompt: PromptWithRelations): boolean {
    const imageUrl = prompt.imageUrl;
    const imageUrls = (prompt as { imageUrls?: string[] }).imageUrls;
    
    // 必须有 R2 图片
    const hasR2Image = (imageUrl && this.isR2ImageUrl(imageUrl)) || 
      (imageUrls && imageUrls.some(url => this.isR2ImageUrl(url)));
    if (!hasR2Image) return false;
    
    // 必须有标签
    if (!prompt.tags || prompt.tags.length === 0) return false;
    
    // 必须有模型标签
    if (!prompt.modelTags || prompt.modelTags.length === 0) return false;
    
    // 必须有描述
    if (!prompt.description || prompt.description.trim() === '') return false;
    
    // 必须有来源
    if (!prompt.source || prompt.source.trim() === '' || prompt.source === 'unknown') return false;
    
    // 必须有分类
    if (!prompt.category) return false;
    
    return true;
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
   * v2.1: 预先创建关联数据 + 重试机制，避免 connectOrCreate 竞争条件
   */
  async bulkCreate(items: CreatePromptInput[]): Promise<{ 
    success: number; 
    failed: number;
    failedItems?: Array<{ index: number; effect: string; error: string }>;
  }> {
    let success = 0;
    let failed = 0;
    const failedItems: Array<{ index: number; effect: string; error: string }> = [];

    // === 步骤1: 预先收集并创建所有唯一的 tags, modelTags, categories ===
    console.log(`[BulkCreate] Step 1: Pre-creating related entities...`);
    
    const allTags = new Set<string>();
    const allModelTags = new Set<string>();
    const allCategories = new Set<string>();
    
    for (const item of items) {
      if (item.tags) {
        for (const tag of item.tags) {
          if (tag && tag.trim()) allTags.add(tag.trim());
        }
      }
      if (item.modelTags) {
        for (const modelTag of item.modelTags) {
          if (modelTag && modelTag.trim()) allModelTags.add(modelTag.trim());
        }
      }
      const categoryName = (item.category || DEFAULT_CATEGORY).trim();
      if (categoryName) allCategories.add(categoryName);
    }
    
    // 批量预创建 tags（忽略已存在的）
    for (const tagName of allTags) {
      try {
        await this.prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: { name: tagName },
        });
      } catch {
        // 忽略冲突错误
      }
    }
    
    // 批量预创建 modelTags（忽略已存在的）
    for (const modelTagName of allModelTags) {
      try {
        await this.prisma.modelTag.upsert({
          where: { name: modelTagName },
          update: {},
          create: { name: modelTagName },
        });
      } catch {
        // 忽略冲突错误
      }
    }
    
    // 批量预创建 categories（忽略已存在的）
    for (const categoryName of allCategories) {
      try {
        await this.prisma.category.upsert({
          where: { name: categoryName },
          update: {},
          create: { name: categoryName },
        });
      } catch {
        // 忽略冲突错误
      }
    }
    
    console.log(`[BulkCreate] Pre-created: ${allTags.size} tags, ${allModelTags.size} modelTags, ${allCategories.size} categories`);

    // === 步骤2: 分批处理导入 ===
    const BATCH_SIZE = 50;
    const batches: Array<{ items: CreatePromptInput[]; startIndex: number }> = [];
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push({
        items: items.slice(i, i + BATCH_SIZE),
        startIndex: i,
      });
    }

    console.log(`[BulkCreate] Step 2: Importing ${items.length} items in ${batches.length} batches`);

    // 逐批处理
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartTime = Date.now();
      let batchSuccess = 0;
      let batchFailed = 0;

      // 逐条插入，带重试机制
      for (let i = 0; i < batch.items.length; i++) {
        const item = batch.items[i];
        const globalIndex = batch.startIndex + i;

        // 尝试最多3次
        let lastError: unknown = null;
        let succeeded = false;
        
        for (let attempt = 0; attempt < 3 && !succeeded; attempt++) {
          try {
            const categoryName = (item.category || DEFAULT_CATEGORY).trim();
            
            // 使用统一的图片处理工具函数
            const { primaryImageUrl, imageUrls } = normalizeImageUrls(item.imageUrl, item.imageUrls);

            // 过滤掉空的 tag 名称
            const validTags = (item.tags || []).filter((name): name is string => 
              typeof name === 'string' && name.trim().length > 0
            ).map(name => name.trim());
            
            const validModelTags = (item.modelTags || []).filter((name): name is string => 
              typeof name === 'string' && name.trim().length > 0
            ).map(name => name.trim());

            // Parse createdAt if provided
            const createdAtDate = item.createdAt ? new Date(item.createdAt) : undefined;
            const validCreatedAt = createdAtDate && !isNaN(createdAtDate.getTime()) ? createdAtDate : undefined;

            await this.prisma.prompt.create({
              data: {
                effect: item.effect,
                description: item.description || '',
                prompt: item.prompt,
                source: item.source || 'unknown',
                imageUrl: primaryImageUrl || null,
                imageUrls: imageUrls,
                tags: validTags.length > 0 ? {
                  connect: validTags.map((name) => ({ name })),
                } : undefined,
                modelTags: validModelTags.length > 0 ? {
                  connect: validModelTags.map((name) => ({ name })),
                } : undefined,
                category: {
                  connect: { name: categoryName },
                },
                ...(validCreatedAt && { createdAt: validCreatedAt }),
              },
            });
            succeeded = true;
            success++;
            batchSuccess++;
          } catch (error) {
            lastError = error;
            
            // 如果是唯一约束冲突（P2002）或记录不存在（P2025），等待一下再重试
            const prismaError = error as Error & { code?: string };
            if (prismaError.code === 'P2002' || prismaError.code === 'P2025') {
              // 短暂等待后重试
              await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
              continue;
            }
            
            // 其他错误直接跳出重试循环
            break;
          }
        }
        
        if (!succeeded) {
          failed++;
          batchFailed++;
          
          // 提取详细的错误信息
          const errorMessage = this.extractErrorMessage(lastError);
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
              tags: item.tags,
              modelTags: item.modelTags,
              category: item.category,
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

