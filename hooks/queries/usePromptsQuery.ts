'use client';

/**
 * Prompts Query Hooks
 * React Query hooks for fetching and mutating prompts
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { promptService, PaginatedResponse } from '@/services/prompt.service';
import { CreatePromptRequest, PromptItem } from '@/types';

// Query keys
export const promptKeys = {
  all: ['prompts'] as const,
  lists: () => [...promptKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...promptKeys.lists(), filters] as const,
  details: () => [...promptKeys.all, 'detail'] as const,
  detail: (id: string) => [...promptKeys.details(), id] as const,
  infinite: (filters?: Record<string, unknown>) => [...promptKeys.all, 'infinite', ...(filters ? [filters] : [])] as const,
  paginated: (page: number, pageSize: number, filters?: Record<string, unknown>) => 
    [...promptKeys.all, 'paginated', page, pageSize, ...(filters ? [filters] : [])] as const,
};

/**
 * Hook to fetch all prompts
 * @param initialData - Optional initial data from server-side rendering
 */
export function usePromptsQuery(initialData?: PromptItem[]) {
  return useQuery({
    queryKey: promptKeys.lists(),
    queryFn: async () => {
      const result = await promptService.getAll();
      // Handle both array and paginated response
      if (Array.isArray(result)) return result;
      return result.data;
    },
    initialData,
    // If initial data is provided, don't refetch immediately
    staleTime: initialData ? 60 * 1000 : 0,
  });
}

/**
 * Hook to fetch prompts with infinite scrolling
 * @param initialData - Optional initial paginated data
 * @param filters - Optional filters
 */
export function usePromptsInfiniteQuery(
  initialData?: PaginatedResponse<PromptItem>,
  filters?: { search?: string; category?: string; tag?: string; modelTag?: string }
) {
  return useInfiniteQuery({
    queryKey: promptKeys.infinite(filters),
    queryFn: async ({ pageParam = 1 }) => {
      return promptService.getPaginated(pageParam, 20, filters);
    },
    getNextPageParam: (lastPage: PaginatedResponse<PromptItem>) => {
      if (lastPage.pagination.hasNext) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    initialData: initialData ? {
      pages: [initialData],
      pageParams: [1]
    } : undefined,
    // 减少 staleTime 以便更快获取最新数据
    // 初始数据来自 SSR，之后每 30 秒检查一次是否有更新
    staleTime: 30 * 1000, // 30 seconds stale time
    // 页面获得焦点时自动刷新
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch prompts with standard pagination
 */
export function usePromptsPaginatedQuery(
  page: number,
  pageSize: number,
  filters?: { search?: string; category?: string; tag?: string; modelTag?: string },
  initialData?: PaginatedResponse<PromptItem>
) {
  // Check if any filter is active
  const hasActiveFilters = filters && Object.values(filters).some(val => val && val.trim() !== '');

  return useQuery({
    queryKey: promptKeys.paginated(page, pageSize, filters),
    queryFn: () => promptService.getPaginated(page, pageSize, filters),
    placeholderData: keepPreviousData,
    initialData: (page === 1 && !hasActiveFilters && initialData) ? initialData : undefined,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch a single prompt by ID
 */
export function usePromptQuery(id: string | null) {
  return useQuery({
    queryKey: promptKeys.detail(id || ''),
    queryFn: () => promptService.getById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create a new prompt
 */
export function useCreatePromptMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePromptRequest) => promptService.create(data),
    onSuccess: () => {
      // Invalidate all prompt queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: promptKeys.all });
    },
  });
}

/**
 * Hook to update a prompt
 */
export function useUpdatePromptMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePromptRequest> }) =>
      promptService.update(id, data),
    onSuccess: (updatedPrompt: PromptItem) => {
      // Update the specific prompt in cache
      queryClient.setQueryData(promptKeys.detail(updatedPrompt.id), updatedPrompt);
      // Invalidate all lists
      queryClient.invalidateQueries({ queryKey: promptKeys.all });
    },
  });
}

/**
 * Hook to delete a prompt
 */
export function useDeletePromptMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => promptService.delete(id),
    onSuccess: (_: unknown, id: string) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: promptKeys.detail(id) });
      // Invalidate all lists
      queryClient.invalidateQueries({ queryKey: promptKeys.all });
    },
  });
}

/**
 * Hook to interact with a prompt (like or heart)
 */
export function useInteractPromptMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'like' | 'heart' }) =>
      promptService.interact(id, type),
    onSuccess: (updatedPrompt: PromptItem) => {
      // Update the specific prompt in cache
      queryClient.setQueryData(promptKeys.detail(updatedPrompt.id), updatedPrompt);
      
      // Update the list cache to reflect changes without a full refetch
      queryClient.setQueriesData<PromptItem[]>(
        { queryKey: promptKeys.lists() },
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p));
        }
      );
      
      // Update paginated queries
      queryClient.setQueriesData<PaginatedResponse<PromptItem>>(
        { queryKey: ['prompts', 'paginated'] },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p))
          };
        }
      );

      // Update infinite query data
      queryClient.setQueryData(
        promptKeys.infinite(),
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: PaginatedResponse<PromptItem>) => ({
              ...page,
              data: page.data.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p))
            }))
          };
        }
      );
    },
  });
}

/**
 * Hook to get prompts with optimistic updates support
 */
export function usePromptsWithOptimisticUpdates() {
  const queryClient = useQueryClient();
  const { data: prompts = [], isLoading, error, refetch } = usePromptsQuery();

  const createMutation = useCreatePromptMutation();
  const updateMutation = useUpdatePromptMutation();
  const deleteMutation = useDeletePromptMutation();
  const interactMutation = useInteractPromptMutation();

  return {
    prompts,
    isLoading,
    error,
    refetch,
    create: createMutation.mutateAsync,
    update: (id: string, data: Partial<CreatePromptRequest>) =>
      updateMutation.mutateAsync({ id, data }),
    delete: deleteMutation.mutateAsync,
    interact: (id: string, type: 'like' | 'heart') =>
      interactMutation.mutateAsync({ id, type }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isInteracting: interactMutation.isPending,
  };
}
