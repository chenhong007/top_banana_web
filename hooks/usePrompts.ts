/**
 * usePrompts Hook
 * Manages prompt data fetching and state
 */

import { useState, useEffect } from 'react';
import { PromptItem } from '@/types';
import { promptService } from '@/services/prompt.service';
import { useToast } from '@/components/shared/ToastContainer';
import { formatErrorMessage } from '@/lib/error-handler';

export function usePrompts() {
  const toast = useToast();
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const data = await promptService.getAll();
      setPrompts(data);
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

