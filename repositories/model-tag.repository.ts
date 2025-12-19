/**
 * ModelTag Repository
 * Handles all database operations for ModelTag model
 */

import { ModelTag } from '@prisma/client';
import { BaseRepository } from './base.repository';

// DTO for API responses
export interface ModelTagDTO {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  type?: string;
  createdAt: string;
}

// Input for creating model tags
export interface CreateModelTagInput {
  name: string;
  icon?: string;
  color?: string;
  type?: string;
}

class ModelTagRepository extends BaseRepository<ModelTag, CreateModelTagInput, Partial<CreateModelTagInput>, ModelTagDTO> {
  protected toDTO(modelTag: ModelTag): ModelTagDTO {
    return {
      id: modelTag.id,
      name: modelTag.name,
      icon: modelTag.icon || undefined,
      color: modelTag.color || undefined,
      type: modelTag.type || undefined,
      createdAt: modelTag.createdAt.toISOString(),
    };
  }

  /**
   * Find all model tags (names only)
   */
  async findAll(): Promise<string[]> {
    try {
      const modelTags = await this.prisma.modelTag.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return modelTags.map((m) => m.name);
    } catch (error) {
      this.handleError(error, 'ModelTagRepository.findAll');
    }
  }

  /**
   * Find all model tags with details
   */
  async findAllWithDetails(): Promise<ModelTagDTO[]> {
    try {
      const modelTags = await this.prisma.modelTag.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return modelTags.map((m) => this.toDTO(m));
    } catch (error) {
      this.handleError(error, 'ModelTagRepository.findAllWithDetails');
    }
  }

  /**
   * Find a model tag by name
   */
  async findByName(name: string): Promise<ModelTagDTO | null> {
    try {
      const modelTag = await this.prisma.modelTag.findUnique({
        where: { name },
      });
      return modelTag ? this.toDTO(modelTag) : null;
    } catch (error) {
      this.handleError(error, 'ModelTagRepository.findByName');
    }
  }

  /**
   * Find model tags by type
   */
  async findByType(type: string): Promise<ModelTagDTO[]> {
    try {
      const modelTags = await this.prisma.modelTag.findMany({
        where: { type },
        orderBy: { createdAt: 'asc' },
      });
      return modelTags.map((m) => this.toDTO(m));
    } catch (error) {
      this.handleError(error, 'ModelTagRepository.findByType');
    }
  }

  /**
   * Create a new model tag
   */
  async create(data: CreateModelTagInput): Promise<ModelTagDTO | null> {
    try {
      const modelTag = await this.prisma.modelTag.create({
        data: {
          name: data.name,
          icon: data.icon || null,
          color: data.color || null,
          type: data.type || null,
        },
      });
      return this.toDTO(modelTag);
    } catch (error) {
      console.error('Error creating model tag:', error);
      return null;
    }
  }

  /**
   * Update a model tag
   */
  async update(name: string, data: Partial<CreateModelTagInput>): Promise<boolean> {
    try {
      await this.prisma.modelTag.update({
        where: { name },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.icon !== undefined && { icon: data.icon || null }),
          ...(data.color !== undefined && { color: data.color || null }),
          ...(data.type !== undefined && { type: data.type || null }),
        },
      });
      return true;
    } catch (error) {
      console.error('Error updating model tag:', error);
      return false;
    }
  }

  /**
   * Delete a model tag by name
   */
  async delete(name: string): Promise<boolean> {
    try {
      await this.prisma.modelTag.delete({ where: { name } });
      return true;
    } catch (error) {
      console.error('Error deleting model tag:', error);
      return false;
    }
  }

  /**
   * Initialize default model tags
   */
  async initializeDefaults(defaults: CreateModelTagInput[]): Promise<number> {
    let created = 0;

    for (const data of defaults) {
      try {
        await this.prisma.modelTag.upsert({
          where: { name: data.name },
          update: {
            icon: data.icon || null,
            color: data.color || null,
            type: data.type || null,
          },
          create: {
            name: data.name,
            icon: data.icon || null,
            color: data.color || null,
            type: data.type || null,
          },
        });
        created++;
      } catch (error) {
        console.error(`Failed to create model tag "${data.name}":`, error);
      }
    }

    return created;
  }

  /**
   * Count total model tags
   */
  async count(): Promise<number> {
    try {
      return await this.prisma.modelTag.count();
    } catch (error) {
      this.handleError(error, 'ModelTagRepository.count');
    }
  }
}

// Export singleton instance
export const modelTagRepository = new ModelTagRepository();

