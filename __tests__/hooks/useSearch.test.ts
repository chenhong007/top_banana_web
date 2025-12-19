/**
 * useSearch Hook Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from '@/hooks/useSearch';
import { PromptItem } from '@/types';

// Mock prompts data
const mockPrompts: PromptItem[] = [
  {
    id: '1',
    effect: 'Test Effect 1',
    description: 'Description for test 1',
    tags: ['tag1', 'tag2'],
    modelTags: ['Midjourney'],
    prompt: 'Test prompt content 1',
    source: 'https://example.com/1',
    category: '文生图',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    effect: 'Another Effect',
    description: 'Description for test 2',
    tags: ['tag2', 'tag3'],
    modelTags: ['DALL-E 3'],
    prompt: 'Another prompt content',
    source: 'https://example.com/2',
    category: '文生视频',
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: '3',
    effect: 'Third Effect',
    description: 'Special description',
    tags: ['tag1'],
    modelTags: ['Midjourney', 'Stable Diffusion'],
    prompt: 'Third prompt with special content',
    source: 'https://example.com/3',
    category: '文生图',
    createdAt: '2024-01-03T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
  },
];

describe('useSearch Hook', () => {
  describe('Initial State', () => {
    it('should return all prompts when no filters are applied', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      expect(result.current.filteredPrompts).toHaveLength(3);
      expect(result.current.searchTerm).toBe('');
      expect(result.current.selectedTag).toBe('');
      expect(result.current.selectedCategory).toBe('');
      expect(result.current.selectedModelTag).toBe('');
    });

    it('should extract all unique tags', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      expect(result.current.allTags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should extract all unique categories', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      expect(result.current.allCategories).toEqual(['文生图', '文生视频']);
    });

    it('should extract all unique model tags', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      expect(result.current.allModelTags).toContain('Midjourney');
      expect(result.current.allModelTags).toContain('DALL-E 3');
      expect(result.current.allModelTags).toContain('Stable Diffusion');
    });
  });

  describe('Search Filtering', () => {
    it('should filter by effect name', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSearchTerm('Another');
      });

      expect(result.current.filteredPrompts).toHaveLength(1);
      expect(result.current.filteredPrompts[0].id).toBe('2');
    });

    it('should filter by description', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSearchTerm('special');
      });

      expect(result.current.filteredPrompts).toHaveLength(1);
      expect(result.current.filteredPrompts[0].id).toBe('3');
    });

    it('should filter by prompt content', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSearchTerm('content 1');
      });

      expect(result.current.filteredPrompts).toHaveLength(1);
      expect(result.current.filteredPrompts[0].id).toBe('1');
    });

    it('should be case insensitive', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSearchTerm('ANOTHER');
      });

      expect(result.current.filteredPrompts).toHaveLength(1);
    });
  });

  describe('Tag Filtering', () => {
    it('should filter by selected tag', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSelectedTag('tag3');
      });

      expect(result.current.filteredPrompts).toHaveLength(1);
      expect(result.current.filteredPrompts[0].id).toBe('2');
    });

    it('should return multiple results for common tags', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSelectedTag('tag1');
      });

      expect(result.current.filteredPrompts).toHaveLength(2);
    });
  });

  describe('Category Filtering', () => {
    it('should filter by category', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSelectedCategory('文生视频');
      });

      expect(result.current.filteredPrompts).toHaveLength(1);
      expect(result.current.filteredPrompts[0].id).toBe('2');
    });
  });

  describe('Model Tag Filtering', () => {
    it('should filter by model tag', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSelectedModelTag('DALL-E 3');
      });

      expect(result.current.filteredPrompts).toHaveLength(1);
      expect(result.current.filteredPrompts[0].id).toBe('2');
    });

    it('should return prompts with any of the selected model tags', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSelectedModelTag('Midjourney');
      });

      expect(result.current.filteredPrompts).toHaveLength(2);
    });
  });

  describe('Combined Filtering', () => {
    it('should combine search and tag filters', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSearchTerm('Test');
        result.current.setSelectedTag('tag1');
      });

      expect(result.current.filteredPrompts).toHaveLength(1);
      expect(result.current.filteredPrompts[0].id).toBe('1');
    });

    it('should combine all filters', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSelectedCategory('文生图');
        result.current.setSelectedModelTag('Midjourney');
        result.current.setSelectedTag('tag1');
      });

      expect(result.current.filteredPrompts).toHaveLength(2);
    });
  });

  describe('Clear Filters', () => {
    it('should clear all filters', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSearchTerm('test');
        result.current.setSelectedTag('tag1');
        result.current.setSelectedCategory('文生图');
        result.current.setSelectedModelTag('Midjourney');
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.searchTerm).toBe('');
      expect(result.current.selectedTag).toBe('');
      expect(result.current.selectedCategory).toBe('');
      expect(result.current.selectedModelTag).toBe('');
      expect(result.current.filteredPrompts).toHaveLength(3);
    });
  });

  describe('hasFilters', () => {
    it('should return false when no filters are applied', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      expect(result.current.hasFilters).toBe(false);
    });

    it('should return true when search term is set', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSearchTerm('test');
      });

      expect(result.current.hasFilters).toBe(true);
    });

    it('should return true when any filter is set', () => {
      const { result } = renderHook(() => useSearch(mockPrompts));

      act(() => {
        result.current.setSelectedTag('tag1');
      });

      expect(result.current.hasFilters).toBe(true);
    });
  });
});

