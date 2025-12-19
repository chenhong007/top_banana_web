/**
 * Prompt Repository Tests
 * Unit tests with mocked Prisma client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma client
vi.mock('@/lib/db', () => ({
  default: {
    prompt: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import prisma from '@/lib/db';
import { promptRepository } from '@/repositories';

// Sample mock data
const mockPromptFromDb = {
  id: 'test-id-1',
  effect: 'Test Effect',
  description: 'Test Description',
  prompt: 'Test prompt content',
  source: 'https://example.com',
  imageUrl: 'https://example.com/image.png',
  categoryId: 'cat-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  tags: [{ id: 'tag-1', name: 'tag1' }, { id: 'tag-2', name: 'tag2' }],
  category: { id: 'cat-1', name: '文生图' },
  modelTags: [{ id: 'mt-1', name: 'Midjourney' }],
};

describe('PromptRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all prompts with relations', async () => {
      const mockPrompts = [mockPromptFromDb];
      vi.mocked(prisma.prompt.findMany).mockResolvedValue(mockPrompts as any);

      const result = await promptRepository.findAll();

      expect(prisma.prompt.findMany).toHaveBeenCalledWith({
        include: { tags: true, category: true, modelTags: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-id-1');
      expect(result[0].tags).toEqual(['tag1', 'tag2']);
      expect(result[0].category).toBe('文生图');
      expect(result[0].modelTags).toEqual(['Midjourney']);
    });

    it('should return empty array when no prompts exist', async () => {
      vi.mocked(prisma.prompt.findMany).mockResolvedValue([]);

      const result = await promptRepository.findAll();

      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return prompt by id', async () => {
      vi.mocked(prisma.prompt.findUnique).mockResolvedValue(mockPromptFromDb as any);

      const result = await promptRepository.findById('test-id-1');

      expect(prisma.prompt.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id-1' },
        include: { tags: true, category: true, modelTags: true },
      });
      expect(result?.id).toBe('test-id-1');
      expect(result?.effect).toBe('Test Effect');
    });

    it('should return null when prompt not found', async () => {
      vi.mocked(prisma.prompt.findUnique).mockResolvedValue(null);

      const result = await promptRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new prompt with tags and category', async () => {
      vi.mocked(prisma.prompt.create).mockResolvedValue(mockPromptFromDb as any);

      const newPromptData = {
        effect: 'Test Effect',
        description: 'Test Description',
        prompt: 'Test prompt content',
        source: 'https://example.com',
        tags: ['tag1', 'tag2'],
        modelTags: ['Midjourney'],
        category: '文生图',
        imageUrl: 'https://example.com/image.png',
      };

      const result = await promptRepository.create(newPromptData);

      expect(prisma.prompt.create).toHaveBeenCalled();
      expect(result.effect).toBe('Test Effect');
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('update', () => {
    it('should update an existing prompt', async () => {
      vi.mocked(prisma.prompt.update).mockResolvedValue(mockPromptFromDb as any);

      const updateData = {
        effect: 'Updated Effect',
        tags: ['newTag'],
      };

      const result = await promptRepository.update('test-id-1', updateData);

      expect(prisma.prompt.update).toHaveBeenCalled();
      expect(result).not.toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a prompt by id', async () => {
      vi.mocked(prisma.prompt.delete).mockResolvedValue(mockPromptFromDb as any);

      const result = await promptRepository.delete('test-id-1');

      expect(prisma.prompt.delete).toHaveBeenCalledWith({
        where: { id: 'test-id-1' },
      });
      expect(result).toBe(true);
    });

    it('should return false when delete fails', async () => {
      vi.mocked(prisma.prompt.delete).mockRejectedValue(new Error('Not found'));

      const result = await promptRepository.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return total count of prompts', async () => {
      vi.mocked(prisma.prompt.count).mockResolvedValue(42);

      const result = await promptRepository.count();

      expect(prisma.prompt.count).toHaveBeenCalled();
      expect(result).toBe(42);
    });
  });
});

