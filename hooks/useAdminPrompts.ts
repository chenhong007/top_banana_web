/**
 * useAdminPrompts Hook
 * React Query based hook for Admin page prompt management
 * Replaces the legacy usePrompts + usePromptForm combination
 */

'use client';

import { useState } from 'react';
import { PromptItem, CreatePromptRequest } from '@/types';
import { useToast } from '@/components/shared/ToastContainer';
import { formatErrorMessage } from '@/lib/error-handler';
import {
  usePromptsQuery,
  useCreatePromptMutation,
  useUpdatePromptMutation,
  useDeletePromptMutation,
} from '@/hooks/queries';

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

/**
 * Hook combining prompts data fetching and form management for Admin page
 * Uses React Query for data fetching and mutations
 */
export function useAdminPrompts() {
  const toast = useToast();
  
  // React Query hooks
  const { data: prompts = [], isLoading, refetch } = usePromptsQuery();
  const createMutation = useCreatePromptMutation();
  const updateMutation = useUpdatePromptMutation();
  const deleteMutation = useDeletePromptMutation();

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
    const imageUrls = prompt.imageUrls && prompt.imageUrls.length > 0 
      ? prompt.imageUrls 
      : (prompt.imageUrl ? [prompt.imageUrl] : []);
    setFormData({
      effect: prompt.effect || '',
      description: prompt.description || '',
      tags: prompt.tags || [],
      modelTags: prompt.modelTags || [],
      prompt: prompt.prompt || '',
      source: prompt.source || '',
      imageUrl: imageUrls.length > 0 ? imageUrls[0] : '',
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

