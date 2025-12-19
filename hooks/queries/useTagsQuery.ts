'use client';

/**
 * Tags Query Hook
 * React Query hook for fetching tags
 */

import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@/lib/constants';

// Query keys
export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
};

/**
 * Fetch all tags from API
 */
async function fetchTags(): Promise<string[]> {
  const response = await fetch(API_ENDPOINTS.TAGS);
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch tags');
  }

  return result.data || [];
}

/**
 * Hook to fetch all tags
 */
export function useTagsQuery() {
  return useQuery({
    queryKey: tagKeys.lists(),
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

