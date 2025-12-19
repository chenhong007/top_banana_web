/**
 * usePagination Hook Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '@/hooks/usePagination';

// Generate mock items
const generateMockItems = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `${i + 1}`, name: `Item ${i + 1}` }));

describe('usePagination Hook', () => {
  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(12); // Default page size
      expect(result.current.totalItems).toBe(50);
    });

    it('should calculate total pages correctly', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      // 50 items / 12 per page = 5 pages (ceiling)
      expect(result.current.totalPages).toBe(5);
    });

    it('should return correct paginated items for first page', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      expect(result.current.paginatedItems).toHaveLength(12);
      expect(result.current.paginatedItems[0].id).toBe('1');
      expect(result.current.paginatedItems[11].id).toBe('12');
    });
  });

  describe('Navigation', () => {
    it('should go to next page', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      act(() => {
        result.current.goToPage(2);
      });

      expect(result.current.currentPage).toBe(2);
      expect(result.current.paginatedItems[0].id).toBe('13');
    });

    it('should go to previous page', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      act(() => {
        result.current.goToPage(3);
      });

      act(() => {
        result.current.goToPage(2);
      });

      expect(result.current.currentPage).toBe(2);
    });

    it('should not go below page 1', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      act(() => {
        result.current.goToPage(0);
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('should not go above total pages', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      act(() => {
        result.current.goToPage(100);
      });

      expect(result.current.currentPage).toBe(5);
    });
  });

  describe('Page Size', () => {
    it('should change page size', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      act(() => {
        result.current.changePageSize(24);
      });

      expect(result.current.pageSize).toBe(24);
      expect(result.current.paginatedItems).toHaveLength(24);
      expect(result.current.totalPages).toBe(3); // 50 / 24 = 3 pages
    });

    it('should reset to page 1 when page size changes', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      act(() => {
        result.current.goToPage(3);
      });

      act(() => {
        result.current.changePageSize(6);
      });

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('Has Next/Previous', () => {
    it('should indicate has next page when not on last page', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      expect(result.current.hasNextPage).toBe(true);
    });

    it('should indicate no next page when on last page', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      act(() => {
        result.current.goToPage(5);
      });

      expect(result.current.hasNextPage).toBe(false);
    });

    it('should indicate no previous page when on first page', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      expect(result.current.hasPreviousPage).toBe(false);
    });

    it('should indicate has previous page when not on first page', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      act(() => {
        result.current.goToPage(2);
      });

      expect(result.current.hasPreviousPage).toBe(true);
    });
  });

  describe('Reset Pagination', () => {
    it('should reset to page 1', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      act(() => {
        result.current.goToPage(3);
      });

      act(() => {
        result.current.resetPagination();
      });

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      const { result } = renderHook(() => usePagination([]));

      expect(result.current.totalItems).toBe(0);
      expect(result.current.totalPages).toBe(0);
      expect(result.current.paginatedItems).toHaveLength(0);
    });

    it('should handle items less than page size', () => {
      const items = generateMockItems(5);
      const { result } = renderHook(() => usePagination(items));

      expect(result.current.totalPages).toBe(1);
      expect(result.current.paginatedItems).toHaveLength(5);
      expect(result.current.hasNextPage).toBe(false);
    });

    it('should handle last page with fewer items', () => {
      const items = generateMockItems(50);
      const { result } = renderHook(() => usePagination(items));

      act(() => {
        result.current.goToPage(5);
      });

      // Last page should have 50 - (4 * 12) = 2 items
      expect(result.current.paginatedItems).toHaveLength(2);
    });
  });
});

