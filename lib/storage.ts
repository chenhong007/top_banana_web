/**
 * Storage Layer
 * Handles all prompt data persistence using database
 */

import { PromptItem } from '@/types';
import prisma from './db';

/**
 * Read all prompts from database
 */
export async function readPrompts(): Promise<PromptItem[]> {
  try {
    const prompts = await prisma.prompt.findMany({
      include: { tags: true },
      orderBy: { createdAt: 'desc' },
    });

    return prompts.map((p) => ({
      id: p.id,
      effect: p.effect,
      description: p.description,
      tags: p.tags.map((t) => t.name),
      prompt: p.prompt,
      source: p.source,
      imageUrl: p.imageUrl || undefined,
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
      include: { tags: true },
    });

    if (!prompt) return null;

    return {
      id: prompt.id,
      effect: prompt.effect,
      description: prompt.description,
      tags: prompt.tags.map((t) => t.name),
      prompt: prompt.prompt,
      source: prompt.source,
      imageUrl: prompt.imageUrl || undefined,
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
    },
    include: { tags: true },
  });

  return {
    id: prompt.id,
    effect: prompt.effect,
    description: prompt.description,
    tags: prompt.tags.map((t) => t.name),
    prompt: prompt.prompt,
    source: prompt.source,
    imageUrl: prompt.imageUrl || undefined,
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
    // First disconnect all existing tags if tags are being updated
    if (data.tags) {
      await prisma.prompt.update({
        where: { id },
        data: { tags: { set: [] } },
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
      },
      include: { tags: true },
    });

    return {
      id: prompt.id,
      effect: prompt.effect,
      description: prompt.description,
      tags: prompt.tags.map((t) => t.name),
      prompt: prompt.prompt,
      source: prompt.source,
      imageUrl: prompt.imageUrl || undefined,
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

// Legacy sync functions - deprecated, will be removed
// These are kept temporarily for backward compatibility during migration
export function writePrompts(_prompts: PromptItem[]): void {
  console.warn('writePrompts is deprecated. Use individual create/update/delete methods.');
}
