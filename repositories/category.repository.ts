/**
 * Category Repository
 * Handles all database operations for Category model
 */

import { Category } from '@prisma/client';
import { BaseRepository } from './base.repository';

// DTO for API responses
export interface CategoryDTO {
  id: string;
  name: string;
  createdAt: string;
}

class CategoryRepository extends BaseRepository<Category, string, string, CategoryDTO> {
  protected toDTO(category: Category): CategoryDTO {
    return {
      id: category.id,
      name: category.name,
      createdAt: category.createdAt.toISOString(),
    };
  }

  /**
   * Find all categories (names only)
   */
  async findAll(): Promise<string[]> {
    try {
      const categories = await this.prisma.category.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return categories.map((c) => c.name);
    } catch (error) {
      this.handleError(error, 'CategoryRepository.findAll');
    }
  }

  /**
   * Find all categories with details
   */
  async findAllWithDetails(): Promise<CategoryDTO[]> {
    try {
      const categories = await this.prisma.category.findMany({
        orderBy: { createdAt: 'asc' },
      });
      return categories.map((c) => this.toDTO(c));
    } catch (error) {
      this.handleError(error, 'CategoryRepository.findAllWithDetails');
    }
  }

  /**
   * Find a category by name
   */
  async findByName(name: string): Promise<CategoryDTO | null> {
    try {
      const category = await this.prisma.category.findUnique({
        where: { name },
      });
      return category ? this.toDTO(category) : null;
    } catch (error) {
      this.handleError(error, 'CategoryRepository.findByName');
    }
  }

  /**
   * Create a new category
   */
  async create(name: string): Promise<CategoryDTO | null> {
    try {
      const category = await this.prisma.category.create({
        data: { name },
      });
      return this.toDTO(category);
    } catch (error) {
      console.error('Error creating category:', error);
      return null;
    }
  }

  /**
   * Update a category name
   */
  async update(oldName: string, newName: string): Promise<boolean> {
    try {
      await this.prisma.category.update({
        where: { name: oldName },
        data: { name: newName },
      });
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      return false;
    }
  }

  /**
   * Delete a category by name
   * Sets categoryId to null for all prompts with this category
   */
  async delete(name: string): Promise<boolean> {
    try {
      const category = await this.prisma.category.findUnique({ where: { name } });
      if (category) {
        // First, set categoryId to null for all prompts with this category
        await this.prisma.prompt.updateMany({
          where: { categoryId: category.id },
          data: { categoryId: null },
        });
      }
      // Then delete the category
      await this.prisma.category.delete({ where: { name } });
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  /**
   * Initialize default categories
   */
  async initializeDefaults(defaults: string[]): Promise<number> {
    let created = 0;

    for (const name of defaults) {
      try {
        await this.prisma.category.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        created++;
      } catch (error) {
        console.error(`Failed to create category "${name}":`, error);
      }
    }

    return created;
  }

  /**
   * Count total categories
   */
  async count(): Promise<number> {
    try {
      return await this.prisma.category.count();
    } catch (error) {
      this.handleError(error, 'CategoryRepository.count');
    }
  }
}

// Export singleton instance
export const categoryRepository = new CategoryRepository();

