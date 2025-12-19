/**
 * Tag Repository
 * Handles all database operations for Tag model
 */

import { Tag } from '@prisma/client';
import { BaseRepository } from './base.repository';

// DTO for API responses
export interface TagDTO {
  id: string;
  name: string;
}

class TagRepository extends BaseRepository<Tag, string, string, TagDTO> {
  protected toDTO(tag: Tag): TagDTO {
    return {
      id: tag.id,
      name: tag.name,
    };
  }

  /**
   * Find all tags
   */
  async findAll(): Promise<string[]> {
    try {
      const tags = await this.prisma.tag.findMany({
        orderBy: { name: 'asc' },
      });
      return tags.map((t) => t.name);
    } catch (error) {
      this.handleError(error, 'TagRepository.findAll');
    }
  }

  /**
   * Find all tags with details
   */
  async findAllWithDetails(): Promise<TagDTO[]> {
    try {
      const tags = await this.prisma.tag.findMany({
        orderBy: { name: 'asc' },
      });
      return tags.map((t) => this.toDTO(t));
    } catch (error) {
      this.handleError(error, 'TagRepository.findAllWithDetails');
    }
  }

  /**
   * Find a tag by name
   */
  async findByName(name: string): Promise<TagDTO | null> {
    try {
      const tag = await this.prisma.tag.findUnique({
        where: { name },
      });
      return tag ? this.toDTO(tag) : null;
    } catch (error) {
      this.handleError(error, 'TagRepository.findByName');
    }
  }

  /**
   * Create a new tag
   */
  async create(name: string): Promise<TagDTO | null> {
    try {
      const tag = await this.prisma.tag.create({
        data: { name },
      });
      return this.toDTO(tag);
    } catch (error) {
      console.error('Error creating tag:', error);
      return null;
    }
  }

  /**
   * Update a tag name
   */
  async update(oldName: string, newName: string): Promise<boolean> {
    try {
      await this.prisma.tag.update({
        where: { name: oldName },
        data: { name: newName },
      });
      return true;
    } catch (error) {
      console.error('Error updating tag:', error);
      return false;
    }
  }

  /**
   * Delete a tag by name
   */
  async delete(name: string): Promise<boolean> {
    try {
      await this.prisma.tag.delete({ where: { name } });
      return true;
    } catch (error) {
      console.error('Error deleting tag:', error);
      return false;
    }
  }

  /**
   * Count total tags
   */
  async count(): Promise<number> {
    try {
      return await this.prisma.tag.count();
    } catch (error) {
      this.handleError(error, 'TagRepository.count');
    }
  }
}

// Export singleton instance
export const tagRepository = new TagRepository();

