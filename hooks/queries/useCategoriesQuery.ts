'use client';

/**
 * Categories Query Hook
 * React Query hook for fetching categories
 */

import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@/lib/constants';

// Query keys
export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
};

/**
 * Fetch all categories from API
 */
async function fetchCategories(): Promise<string[]> {
  const response = await fetch(API_ENDPOINTS.CATEGORIES);
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch categories');
  }

  return result.data || [];
}

/**
 * Hook to fetch all categories
 */
export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

