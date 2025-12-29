/**
 * usePrompts Hook
 * @deprecated This hook uses traditional useState pattern.
 * Please use one of the following React Query based alternatives:
 * - `usePromptsQuery` for simple data fetching
 * - `usePromptsWithOptimisticUpdates` for frontend pages with interactions
 * - `useAdminPrompts` for admin pages with full CRUD operations
 * 
 * This file is kept for backward compatibility and will be removed in a future version.
 */

import { useState, useEffect } from 'react';
import { PromptItem } from '@/types';
import { promptService } from '@/services/prompt.service';
import { useToast } from '@/components/shared/ToastContainer';
import { formatErrorMessage } from '@/lib/error-handler';

/**
 * @deprecated Use `usePromptsQuery`, `usePromptsWithOptimisticUpdates`, or `useAdminPrompts` instead.
 */
export function usePrompts() {
  const toast = useToast();
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const data = await promptService.getAll();
      if (Array.isArray(data)) {
        setPrompts(data);
      } else {
        setPrompts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
      toast.showError('获取数据失败：' + formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  return {
    prompts,
    loading,
    refetch: fetchPrompts,
    setPrompts,
  };
}
