/**
 * Query Hooks Module
 * Re-exports all React Query hooks
 */

export {
  usePromptsQuery,
  usePromptQuery,
  useCreatePromptMutation,
  useUpdatePromptMutation,
  useDeletePromptMutation,
  usePromptsWithOptimisticUpdates,
  promptKeys,
} from './usePromptsQuery';

export { useTagsQuery, tagKeys } from './useTagsQuery';

export { useCategoriesQuery, categoryKeys } from './useCategoriesQuery';

export { useModelTagsQuery, modelTagKeys } from './useModelTagsQuery';

