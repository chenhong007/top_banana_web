'use client';

/**
 * Model Tags Query Hook
 * React Query hook for fetching AI model tags
 */

import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@/lib/constants';

// Query keys
export const modelTagKeys = {
  all: ['modelTags'] as const,
  lists: () => [...modelTagKeys.all, 'list'] as const,
};

/**
 * Fetch all model tags from API
 */
async function fetchModelTags(): Promise<string[]> {
  const response = await fetch(API_ENDPOINTS.MODEL_TAGS);
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch model tags');
  }

  return result.data || [];
}

/**
 * Hook to fetch all model tags
 */
export function useModelTagsQuery() {
  return useQuery({
    queryKey: modelTagKeys.lists(),
    queryFn: fetchModelTags,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

