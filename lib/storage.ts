/**
 * Storage Layer
 * Handles all prompt data persistence using database
 * 
 * @deprecated This module is deprecated. Use the new Repository pattern instead:
 * - promptRepository from '@/repositories'
 * - tagRepository from '@/repositories'
 * - categoryRepository from '@/repositories'
 * - modelTagRepository from '@/repositories'
 * 
 * This file is kept for backward compatibility during migration.
 * It will be removed in a future version.
 */

import { PromptItem } from '@/types';
import prisma from './db';
import { DEFAULT_CATEGORY } from './constants';

/**
 * Read all prompts from database
 */
export async function readPrompts(): Promise<PromptItem[]> {
  try {
    const prompts = await prisma.prompt.findMany({
      include: { tags: true, category: true, modelTags: true },
      orderBy: { createdAt: 'desc' },
    });

    return prompts.map((p) => ({
      id: p.id,
      effect: p.effect,
      description: p.description,
      tags: p.tags.map((t) => t.name),
      modelTags: p.modelTags.map((m) => m.name),
      prompt: p.prompt,
      source: p.source,
      imageUrl: p.imageUrl || undefined,
      category: p.category?.name || undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error reading prompts from database:', error);
    return [];
  }
}

/**
 * Get a single prompt by ID
 */
export async function getPromptById(id: string): Promise<PromptItem | null> {
  try {
    const prompt = await prisma.prompt.findUnique({
      where: { id },
      include: { tags: true, category: true, modelTags: true },
    });

    if (!prompt) return null;

    return {
      id: prompt.id,
      effect: prompt.effect,
      description: prompt.description,
      tags: prompt.tags.map((t) => t.name),
      modelTags: prompt.modelTags.map((m) => m.name),
      prompt: prompt.prompt,
      source: prompt.source,
      imageUrl: prompt.imageUrl || undefined,
      category: prompt.category?.name || undefined,
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error('Error getting prompt by id:', error);
    return null;
  }
}

/**
 * Create a new prompt
 */
export async function createPrompt(
  data: Omit<PromptItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PromptItem> {
  // Get or create category
  const categoryName = data.category || DEFAULT_CATEGORY;
  
  const prompt = await prisma.prompt.create({
    data: {
      effect: data.effect,
      description: data.description,
      prompt: data.prompt,
      source: data.source,
      imageUrl: data.imageUrl || null,
      tags: {
        connectOrCreate: data.tags.map((name) => ({
          where: { name },
          create: { name },
        })),
      },
      modelTags: data.modelTags && data.modelTags.length > 0 ? {
        connectOrCreate: data.modelTags.map((name) => ({
          where: { name },
          create: { name },
        })),
      } : undefined,
      category: {
        connectOrCreate: {
          where: { name: categoryName },
          create: { name: categoryName },
        },
      },
    },
    include: { tags: true, category: true, modelTags: true },
  });

  return {
    id: prompt.id,
    effect: prompt.effect,
    description: prompt.description,
    tags: prompt.tags.map((t) => t.name),
    modelTags: prompt.modelTags.map((m) => m.name),
    prompt: prompt.prompt,
    source: prompt.source,
    imageUrl: prompt.imageUrl || undefined,
    category: prompt.category?.name || undefined,
    createdAt: prompt.createdAt.toISOString(),
    updatedAt: prompt.updatedAt.toISOString(),
  };
}

/**
 * Update an existing prompt
 */
export async function updatePrompt(
  id: string,
  data: Partial<Omit<PromptItem, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PromptItem | null> {
  try {
    // First disconnect all existing tags/modelTags if they are being updated
    if (data.tags || data.modelTags) {
      await prisma.prompt.update({
        where: { id },
        data: {
          ...(data.tags && { tags: { set: [] } }),
          ...(data.modelTags && { modelTags: { set: [] } }),
        },
      });
    }

    const prompt = await prisma.prompt.update({
      where: { id },
      data: {
        ...(data.effect !== undefined && { effect: data.effect }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.prompt !== undefined && { prompt: data.prompt }),
        ...(data.source !== undefined && { source: data.source }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
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

    return {
      id: prompt.id,
      effect: prompt.effect,
      description: prompt.description,
      tags: prompt.tags.map((t) => t.name),
      modelTags: prompt.modelTags.map((m) => m.name),
      prompt: prompt.prompt,
      source: prompt.source,
      imageUrl: prompt.imageUrl || undefined,
      category: prompt.category?.name || undefined,
      createdAt: prompt.createdAt.toISOString(),
      updatedAt: prompt.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error('Error updating prompt:', error);
    return null;
  }
}

/**
 * Delete a prompt by ID
 */
export async function deletePrompt(id: string): Promise<boolean> {
  try {
    await prisma.prompt.delete({ where: { id } });
    return true;
  } catch (error) {
    console.error('Error deleting prompt:', error);
    return false;
  }
}

/**
 * Bulk create prompts (for import functionality)
 */
export async function bulkCreatePrompts(
  items: Omit<PromptItem, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<number> {
  let count = 0;

  for (const item of items) {
    try {
      const categoryName = item.category || DEFAULT_CATEGORY;
      
      await prisma.prompt.create({
        data: {
          effect: item.effect,
          description: item.description,
          prompt: item.prompt,
          source: item.source,
          imageUrl: item.imageUrl || null,
          tags: {
            connectOrCreate: item.tags.map((name) => ({
              where: { name },
              create: { name },
            })),
          },
          modelTags: item.modelTags && item.modelTags.length > 0 ? {
            connectOrCreate: item.modelTags.map((name) => ({
              where: { name },
              create: { name },
            })),
          } : undefined,
          category: {
            connectOrCreate: {
              where: { name: categoryName },
              create: { name: categoryName },
            },
          },
        },
      });
      count++;
    } catch (error) {
      console.error(`Failed to import prompt "${item.effect}":`, error);
    }
  }

  return count;
}

/**
 * Generate unique ID (kept for compatibility)
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all unique tags
 */
export async function getAllTags(): Promise<string[]> {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
    return tags.map((t) => t.name);
  } catch (error) {
    console.error('Error getting tags from database:', error);
    return [];
  }
}

/**
 * Create a new tag
 */
export async function createTag(name: string): Promise<string | null> {
  try {
    const tag = await prisma.tag.create({
      data: { name },
    });
    return tag.name;
  } catch (error) {
    console.error('Error creating tag:', error);
    return null;
  }
}

/**
 * Update an existing tag
 */
export async function updateTag(oldName: string, newName: string): Promise<boolean> {
  try {
    await prisma.tag.update({
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
export async function deleteTag(name: string): Promise<boolean> {
  try {
    await prisma.tag.delete({ where: { name } });
    return true;
  } catch (error) {
    console.error('Error deleting tag:', error);
    return false;
  }
}

// ============================================
// Category CRUD Operations
// ============================================

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<string[]> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return categories.map((c) => c.name);
  } catch (error) {
    console.error('Error getting categories from database:', error);
    return [];
  }
}

/**
 * Create a new category
 */
export async function createCategory(name: string): Promise<string | null> {
  try {
    const category = await prisma.category.create({
      data: { name },
    });
    return category.name;
  } catch (error) {
    console.error('Error creating category:', error);
    return null;
  }
}

/**
 * Update an existing category
 */
export async function updateCategory(oldName: string, newName: string): Promise<boolean> {
  try {
    await prisma.category.update({
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
 */
export async function deleteCategory(name: string): Promise<boolean> {
  try {
    // First, set categoryId to null for all prompts with this category
    const category = await prisma.category.findUnique({ where: { name } });
    if (category) {
      await prisma.prompt.updateMany({
        where: { categoryId: category.id },
        data: { categoryId: null },
      });
    }
    // Then delete the category
    await prisma.category.delete({ where: { name } });
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
}

// ============================================
// Model Tag CRUD Operations
// ============================================

/**
 * Get all model tags
 */
export async function getAllModelTags(): Promise<string[]> {
  try {
    const modelTags = await prisma.modelTag.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return modelTags.map((m) => m.name);
  } catch (error) {
    console.error('Error getting model tags from database:', error);
    return [];
  }
}

/**
 * Get model tags with details (including color and type)
 */
export async function getModelTagsWithDetails() {
  try {
    const modelTags = await prisma.modelTag.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return modelTags.map((m) => ({
      id: m.id,
      name: m.name,
      icon: m.icon,
      color: m.color,
      type: m.type,
    }));
  } catch (error) {
    console.error('Error getting model tags with details:', error);
    return [];
  }
}

// Legacy sync functions - deprecated, will be removed
// These are kept temporarily for backward compatibility during migration
export function writePrompts(_prompts: PromptItem[]): void {
  console.warn('writePrompts is deprecated. Use individual create/update/delete methods.');
}
