/**
 * Server-Side Prefetch Utilities
 * Provides utilities for prefetching data on the server with React Query
 */

import { QueryClient, dehydrate } from '@tanstack/react-query';
import { promptRepository, tagRepository, categoryRepository, modelTagRepository } from '@/repositories';
import { promptKeys, tagKeys, categoryKeys, modelTagKeys } from '@/hooks/queries';

/**
 * Create a new QueryClient for server-side prefetching
 */
export function createPrefetchQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute stale time for prefetched data
      },
    },
  });
}

/**
 * Prefetch home page data (prompts, tags, categories, model tags)
 * Returns dehydrated state for hydration on client
 */
export async function prefetchHomePageData() {
  const queryClient = createPrefetchQueryClient();

  // Prefetch all data in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: promptKeys.all,
      queryFn: () => promptRepository.findAll(),
    }),
    queryClient.prefetchQuery({
      queryKey: tagKeys.all,
      queryFn: () => tagRepository.findAll(),
    }),
    queryClient.prefetchQuery({
      queryKey: categoryKeys.all,
      queryFn: () => categoryRepository.findAll(),
    }),
    queryClient.prefetchQuery({
      queryKey: modelTagKeys.all,
      queryFn: () => modelTagRepository.findAll(),
    }),
  ]);

  return {
    dehydratedState: dehydrate(queryClient),
  };
}

/**
 * Prefetch single prompt by ID
 */
export async function prefetchPromptById(id: string) {
  const queryClient = createPrefetchQueryClient();

  await queryClient.prefetchQuery({
    queryKey: promptKeys.detail(id),
    queryFn: () => promptRepository.findById(id),
  });

  return {
    dehydratedState: dehydrate(queryClient),
  };
}

/**
 * Prefetch prompts list only
 */
export async function prefetchPrompts() {
  const queryClient = createPrefetchQueryClient();

  await queryClient.prefetchQuery({
    queryKey: promptKeys.all,
    queryFn: () => promptRepository.findAll(),
  });

  return {
    dehydratedState: dehydrate(queryClient),
  };
}

