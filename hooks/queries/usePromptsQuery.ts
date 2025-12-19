'use client';

/**
 * Prompts Query Hooks
 * React Query hooks for fetching and mutating prompts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptService } from '@/services/prompt.service';
import { CreatePromptRequest, PromptItem } from '@/types';

// Query keys
export const promptKeys = {
  all: ['prompts'] as const,
  lists: () => [...promptKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...promptKeys.lists(), filters] as const,
  details: () => [...promptKeys.all, 'detail'] as const,
  detail: (id: string) => [...promptKeys.details(), id] as const,
};

/**
 * Hook to fetch all prompts
 * @param initialData - Optional initial data from server-side rendering
 */
export function usePromptsQuery(initialData?: PromptItem[]) {
  return useQuery({
    queryKey: promptKeys.all,
    queryFn: () => promptService.getAll(),
    initialData,
    // If initial data is provided, don't refetch immediately
    staleTime: initialData ? 60 * 1000 : 0,
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
      // Invalidate and refetch prompts list
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
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
    onSuccess: (updatedPrompt) => {
      // Update the specific prompt in cache
      queryClient.setQueryData(promptKeys.detail(updatedPrompt.id), updatedPrompt);
      // Invalidate the list to reflect changes
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
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
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: promptKeys.detail(id) });
      // Invalidate the list
      queryClient.invalidateQueries({ queryKey: promptKeys.lists() });
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

  return {
    prompts,
    isLoading,
    error,
    refetch,
    create: createMutation.mutateAsync,
    update: (id: string, data: Partial<CreatePromptRequest>) =>
      updateMutation.mutateAsync({ id, data }),
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

