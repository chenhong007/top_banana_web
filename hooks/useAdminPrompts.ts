/**
 * useAdminPrompts Hook
 * React Query based hook for Admin page prompt management
 * Replaces the legacy usePrompts + usePromptForm combination
 * 
 * 优化：使用分页加载数据，避免一次性加载全部数据导致性能问题
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { PromptItem, CreatePromptRequest } from '@/types';
import { useToast } from '@/components/shared/ToastContainer';
import { formatErrorMessage } from '@/lib/error-handler';
import { useQuery } from '@tanstack/react-query';
import { promptService, PaginatedResponse } from '@/services/prompt.service';
import {
  promptKeys,
  useCreatePromptMutation,
  useUpdatePromptMutation,
  useDeletePromptMutation,
} from '@/hooks/queries';
import { normalizeImageUrls } from '@/lib/image-utils';

const initialFormData: CreatePromptRequest = {
  effect: '',
  description: '',
  tags: [],
  modelTags: [],
  prompt: '',
  source: '',
  imageUrl: '',
  imageUrls: [],
  category: '',
};

// 后台管理每页显示条数
const ADMIN_PAGE_SIZE = 50;

/**
 * Hook combining prompts data fetching and form management for Admin page
 * Uses React Query for data fetching and mutations
 * 使用分页来优化大数据量下的加载性能
 */
export function useAdminPrompts() {
  const toast = useToast();
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  
  // 使用分页查询获取数据
  const { 
    data: paginatedData, 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: [...promptKeys.lists(), { page: currentPage, pageSize: ADMIN_PAGE_SIZE }],
    queryFn: async () => {
      return promptService.getPaginated(currentPage, ADMIN_PAGE_SIZE);
    },
    staleTime: 30 * 1000, // 30秒内不重新请求
  });

  // 提取数据和分页信息
  const prompts = paginatedData?.data || [];
  const pagination = paginatedData?.pagination || {
    page: 1,
    pageSize: ADMIN_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  const createMutation = useCreatePromptMutation();
  const updateMutation = useUpdatePromptMutation();
  const deleteMutation = useDeletePromptMutation();
  
  // 分页控制函数
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  }, [pagination.totalPages]);

  const nextPage = useCallback(() => {
    if (pagination.hasNext) {
      setCurrentPage(prev => prev + 1);
    }
  }, [pagination.hasNext]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrev) {
      setCurrentPage(prev => prev - 1);
    }
  }, [pagination.hasPrev]);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreatePromptRequest>(initialFormData);

  const isEditing = editingId !== null || isCreating;
  const submitting = createMutation.isPending || updateMutation.isPending;

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setIsCreating(false);
  };

  const scrollToForm = () => {
    setTimeout(() => {
      const formElement = document.getElementById('prompt-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
    scrollToForm();
  };

  const startEdit = (prompt: PromptItem) => {
    setEditingId(prompt.id);
    const { primaryImageUrl, imageUrls } = normalizeImageUrls(prompt.imageUrl, prompt.imageUrls);
    setFormData({
      effect: prompt.effect || '',
      description: prompt.description || '',
      tags: prompt.tags || [],
      modelTags: prompt.modelTags || [],
      prompt: prompt.prompt || '',
      source: prompt.source || '',
      imageUrl: primaryImageUrl || '',
      imageUrls: imageUrls,
      category: prompt.category || '',
    });
    setIsCreating(false);
    scrollToForm();
  };

  const cancelEdit = () => {
    resetForm();
  };

  const handleCreate = async (): Promise<PromptItem | null> => {
    if (!formData.effect || !formData.description || !formData.prompt || !formData.source || 
        !formData.tags || formData.tags.length === 0 || 
        !formData.modelTags || formData.modelTags.length === 0) {
      toast.showWarning('请填写所有必填字段');
      return null;
    }

    try {
      const newPrompt = await createMutation.mutateAsync(formData);
      toast.showSuccess('创建成功');
      resetForm();
      return newPrompt;
    } catch (error) {
      console.error('Failed to create prompt:', error);
      toast.showError('创建失败：' + formatErrorMessage(error));
      return null;
    }
  };

  const handleUpdate = async (): Promise<PromptItem | null> => {
    if (!editingId) return null;

    try {
      const updatedPrompt = await updateMutation.mutateAsync({ 
        id: editingId, 
        data: formData 
      });
      toast.showSuccess('更新成功');
      resetForm();
      return updatedPrompt;
    } catch (error) {
      console.error('Failed to update prompt:', error);
      toast.showError('更新失败：' + formatErrorMessage(error));
      return null;
    }
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    if (!confirm('确定要删除这条提示词吗？')) {
      return false;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast.showSuccess('删除成功');
      return true;
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      toast.showError('删除失败：' + formatErrorMessage(error));
      return false;
    }
  };

  const handleTagsChange = (tags: string[]) => {
    setFormData({ ...formData, tags });
  };

  const handleModelTagsChange = (modelTags: string[]) => {
    setFormData({ ...formData, modelTags });
  };

  const onSubmit = async () => {
    if (isCreating) {
      await handleCreate();
    } else {
      await handleUpdate();
    }
  };

  return {
    // Data
    prompts,
    loading: isLoading,
    refetch,

    // Pagination
    pagination,
    currentPage,
    goToPage,
    nextPage,
    prevPage,

    // Form state
    formData,
    setFormData,
    editingId,
    isCreating,
    submitting,
    isEditing,

    // Form actions
    startCreate,
    startEdit,
    cancelEdit,
    onSubmit,
    onDelete: handleDelete,
    handleTagsChange,
    handleModelTagsChange,
  };
}

