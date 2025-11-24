/**
 * usePromptForm Hook
 * Manages prompt form state and CRUD operations
 */

import { useState } from 'react';
import { PromptItem, CreatePromptRequest } from '@/types';
import { promptService } from '@/services/prompt.service';
import { useToast } from '@/components/shared/ToastContainer';
import { formatErrorMessage } from '@/lib/error-handler';

const initialFormData: CreatePromptRequest = {
  effect: '',
  description: '',
  tags: [],
  prompt: '',
  source: '',
  imageUrl: '',
};

export function usePromptForm(onSuccess?: () => void) {
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreatePromptRequest>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setIsCreating(false);
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
    
    // Scroll to form after state update
    setTimeout(() => {
      const formElement = document.getElementById('prompt-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const startEdit = (prompt: PromptItem) => {
    setEditingId(prompt.id);
    setFormData({
      effect: prompt.effect || '',
      description: prompt.description || '',
      tags: prompt.tags || [],
      prompt: prompt.prompt || '',
      source: prompt.source || '',
      imageUrl: prompt.imageUrl || '',
    });
    setIsCreating(false);
    
    // Scroll to form after state update
    setTimeout(() => {
      const formElement = document.getElementById('prompt-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const cancelEdit = () => {
    resetForm();
  };

  const handleCreate = async (): Promise<PromptItem | null> => {
    if (!formData.effect || !formData.description || !formData.prompt || !formData.source) {
      toast.showWarning('请填写所有必填字段');
      return null;
    }

    try {
      setSubmitting(true);
      const newPrompt = await promptService.create(formData);
      toast.showSuccess('创建成功');
      resetForm();
      onSuccess?.();
      return newPrompt;
    } catch (error) {
      console.error('Failed to create prompt:', error);
      toast.showError('创建失败：' + formatErrorMessage(error));
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (): Promise<PromptItem | null> => {
    if (!editingId) return null;

    try {
      setSubmitting(true);
      const updatedPrompt = await promptService.update(editingId, formData);
      toast.showSuccess('更新成功');
      resetForm();
      onSuccess?.();
      return updatedPrompt;
    } catch (error) {
      console.error('Failed to update prompt:', error);
      toast.showError('更新失败：' + formatErrorMessage(error));
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string): Promise<boolean> => {
    if (!confirm('确定要删除这条提示词吗？')) {
      return false;
    }

    try {
      await promptService.delete(id);
      toast.showSuccess('删除成功');
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      toast.showError('删除失败：' + formatErrorMessage(error));
      return false;
    }
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(t => t.trim()).filter(t => t);
    setFormData({ ...formData, tags });
  };

  return {
    // State
    formData,
    editingId,
    isCreating,
    submitting,
    isEditing: editingId !== null || isCreating,

    // Actions
    setFormData,
    resetForm,
    startCreate,
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleTagsChange,
  };
}

