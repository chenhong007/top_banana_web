/**
 * Image Repository
 * Handles all database operations for Image model (R2 storage records)
 */

import { Image } from '@prisma/client';
import { BaseRepository, PaginatedResult, PaginationOptions, calculatePagination } from './base.repository';

// DTO for API responses
export interface ImageDTO {
  id: string;
  key: string;
  originalUrl?: string;
  url: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  promptId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Input for creating image records
export interface CreateImageInput {
  key: string;
  originalUrl?: string;
  url: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  promptId?: string;
  status?: string;
}

// Update input
export interface UpdateImageInput extends Partial<CreateImageInput> {}

// Image status enum
export const ImageStatus = {
  ACTIVE: 'active',
  DELETED: 'deleted',
  PENDING: 'pending',
} as const;

class ImageRepository extends BaseRepository<Image, CreateImageInput, UpdateImageInput, ImageDTO> {
  protected toDTO(image: Image): ImageDTO {
    return {
      id: image.id,
      key: image.key,
      originalUrl: image.originalUrl || undefined,
      url: image.url,
      fileName: image.fileName || undefined,
      contentType: image.contentType || undefined,
      size: image.size || undefined,
      promptId: image.promptId || undefined,
      status: image.status,
      createdAt: image.createdAt.toISOString(),
      updatedAt: image.updatedAt.toISOString(),
    };
  }

  /**
   * Find all images
   */
  async findAll(): Promise<ImageDTO[]> {
    try {
      const images = await this.prisma.image.findMany({
        where: { status: ImageStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
      });
      return images.map((i) => this.toDTO(i));
    } catch (error) {
      this.handleError(error, 'ImageRepository.findAll');
    }
  }

  /**
   * Find images with pagination
   */
  async findPaginated(options: PaginationOptions): Promise<PaginatedResult<ImageDTO>> {
    try {
      const total = await this.prisma.image.count({
        where: { status: ImageStatus.ACTIVE },
      });
      const { skip, take, page, pageSize, totalPages } = calculatePagination(options, total);

      const images = await this.prisma.image.findMany({
        where: { status: ImageStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      return {
        data: images.map((i) => this.toDTO(i)),
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      this.handleError(error, 'ImageRepository.findPaginated');
    }
  }

  /**
   * Find an image by ID
   */
  async findById(id: string): Promise<ImageDTO | null> {
    try {
      const image = await this.prisma.image.findUnique({
        where: { id },
      });
      return image ? this.toDTO(image) : null;
    } catch (error) {
      this.handleError(error, 'ImageRepository.findById');
    }
  }

  /**
   * Find an image by key
   */
  async findByKey(key: string): Promise<ImageDTO | null> {
    try {
      const image = await this.prisma.image.findUnique({
        where: { key },
      });
      return image ? this.toDTO(image) : null;
    } catch (error) {
      this.handleError(error, 'ImageRepository.findByKey');
    }
  }

  /**
   * Find images by prompt ID
   */
  async findByPromptId(promptId: string): Promise<ImageDTO[]> {
    try {
      const images = await this.prisma.image.findMany({
        where: { promptId, status: ImageStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
      });
      return images.map((i) => this.toDTO(i));
    } catch (error) {
      this.handleError(error, 'ImageRepository.findByPromptId');
    }
  }

  /**
   * Find images by original URL
   */
  async findByOriginalUrl(originalUrl: string): Promise<ImageDTO | null> {
    try {
      const image = await this.prisma.image.findFirst({
        where: { originalUrl },
      });
      return image ? this.toDTO(image) : null;
    } catch (error) {
      this.handleError(error, 'ImageRepository.findByOriginalUrl');
    }
  }

  /**
   * Create a new image record
   */
  async create(data: CreateImageInput): Promise<ImageDTO> {
    try {
      const image = await this.prisma.image.create({
        data: {
          key: data.key,
          originalUrl: data.originalUrl || null,
          url: data.url,
          fileName: data.fileName || null,
          contentType: data.contentType || null,
          size: data.size || null,
          promptId: data.promptId || null,
          status: data.status || ImageStatus.ACTIVE,
        },
      });
      return this.toDTO(image);
    } catch (error) {
      this.handleError(error, 'ImageRepository.create');
    }
  }

  /**
   * Update an image record
   */
  async update(id: string, data: UpdateImageInput): Promise<ImageDTO | null> {
    try {
      const image = await this.prisma.image.update({
        where: { id },
        data: {
          ...(data.key !== undefined && { key: data.key }),
          ...(data.originalUrl !== undefined && { originalUrl: data.originalUrl || null }),
          ...(data.url !== undefined && { url: data.url }),
          ...(data.fileName !== undefined && { fileName: data.fileName || null }),
          ...(data.contentType !== undefined && { contentType: data.contentType || null }),
          ...(data.size !== undefined && { size: data.size || null }),
          ...(data.promptId !== undefined && { promptId: data.promptId || null }),
          ...(data.status !== undefined && { status: data.status }),
        },
      });
      return this.toDTO(image);
    } catch (error) {
      console.error('Error updating image:', error);
      return null;
    }
  }

  /**
   * Update image by key
   */
  async updateByKey(key: string, data: UpdateImageInput): Promise<ImageDTO | null> {
    try {
      const image = await this.prisma.image.update({
        where: { key },
        data: {
          ...(data.originalUrl !== undefined && { originalUrl: data.originalUrl || null }),
          ...(data.url !== undefined && { url: data.url }),
          ...(data.fileName !== undefined && { fileName: data.fileName || null }),
          ...(data.contentType !== undefined && { contentType: data.contentType || null }),
          ...(data.size !== undefined && { size: data.size || null }),
          ...(data.promptId !== undefined && { promptId: data.promptId || null }),
          ...(data.status !== undefined && { status: data.status }),
        },
      });
      return this.toDTO(image);
    } catch (error) {
      console.error('Error updating image by key:', error);
      return null;
    }
  }

  /**
   * Soft delete an image (set status to deleted)
   */
  async softDelete(id: string): Promise<boolean> {
    try {
      await this.prisma.image.update({
        where: { id },
        data: { status: ImageStatus.DELETED },
      });
      return true;
    } catch (error) {
      console.error('Error soft deleting image:', error);
      return false;
    }
  }

  /**
   * Soft delete by key
   */
  async softDeleteByKey(key: string): Promise<boolean> {
    try {
      await this.prisma.image.update({
        where: { key },
        data: { status: ImageStatus.DELETED },
      });
      return true;
    } catch (error) {
      console.error('Error soft deleting image by key:', error);
      return false;
    }
  }

  /**
   * Hard delete an image record
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.image.delete({ where: { id } });
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Hard delete by key
   */
  async deleteByKey(key: string): Promise<boolean> {
    try {
      await this.prisma.image.delete({ where: { key } });
      return true;
    } catch (error) {
      console.error('Error deleting image by key:', error);
      return false;
    }
  }

  /**
   * Count images by status
   */
  async countByStatus(status?: string): Promise<number> {
    try {
      return await this.prisma.image.count({
        where: status ? { status } : undefined,
      });
    } catch (error) {
      this.handleError(error, 'ImageRepository.countByStatus');
    }
  }

  /**
   * Get migration status (count of images with/without originalUrl)
   */
  async getMigrationStatus(): Promise<{
    total: number;
    migrated: number;
    pending: number;
  }> {
    try {
      const [total, migrated] = await Promise.all([
        this.prisma.image.count({ where: { status: ImageStatus.ACTIVE } }),
        this.prisma.image.count({
          where: {
            status: ImageStatus.ACTIVE,
            originalUrl: { not: null },
          },
        }),
      ]);

      return {
        total,
        migrated,
        pending: total - migrated,
      };
    } catch (error) {
      this.handleError(error, 'ImageRepository.getMigrationStatus');
    }
  }
}

// Export singleton instance
export const imageRepository = new ImageRepository();

