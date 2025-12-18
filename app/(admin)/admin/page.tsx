'use client';

import { useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';
import ImportModal from '../components/ImportModal';
import AdminHeader from '../components/AdminHeader';
import PromptForm from '../components/PromptForm';
import PromptTable from '../components/PromptTable';
import DashboardStats from '../components/DashboardStats';
import { usePrompts } from '@/hooks/usePrompts';
import { usePromptForm } from '@/hooks/usePromptForm';
import { UI_TEXT, API_ENDPOINTS } from '@/lib/constants';
import { CONTAINER_STYLES } from '@/lib/styles';

export default function AdminPage() {
  const { prompts, loading, refetch, setPrompts } = usePrompts();
  const {
    formData,
    setFormData,
    editingId,
    isCreating,
    submitting,
    isEditing,
    startCreate,
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleTagsChange,
    handleModelTagsChange,
  } = usePromptForm(refetch);

  const [showImportModal, setShowImportModal] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.CATEGORIES);
        const result = await response.json();
        if (result.success && result.data) {
          setCategories(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const onSubmit = async () => {
    if (isCreating) {
      const newPrompt = await handleCreate();
      if (newPrompt) {
        setPrompts([newPrompt, ...prompts]);
      }
    } else {
      if (!editingId) return;
      const updatedPrompt = await handleUpdate();
      if (updatedPrompt) {
        setPrompts(prompts.map(p => p.id === editingId ? updatedPrompt : p));
      }
    }
  };

  const onDelete = async (id: string) => {
    const deleted = await handleDelete(id);
    if (deleted) {
      setPrompts(prompts.filter(p => p.id !== id));
    }
  };

  return (
    <div className={CONTAINER_STYLES.page}>
      <AdminHeader
        onImport={() => setShowImportModal(true)}
        onCreate={startCreate}
      />

      <main className={CONTAINER_STYLES.main}>
        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            refetch();
            setShowImportModal(false);
          }}
        />

        {/* Stats Section */}
        {!loading && prompts.length > 0 && (
          <DashboardStats prompts={prompts} />
        )}

        {isEditing && (
          <div className="mb-8" id="prompt-form">
            <PromptForm
              formData={formData}
              isCreating={isCreating}
              submitting={submitting}
              categories={categories}
              onSubmit={onSubmit}
              onCancel={cancelEdit}
              onChange={setFormData}
              onTagsChange={handleTagsChange}
              onModelTagsChange={handleModelTagsChange}
            />
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {!loading && prompts.length === 0 && (
          <EmptyState
            icon={<FolderOpen className="w-16 h-16 text-gray-300" />}
            title={UI_TEXT.EMPTY_STATE.TITLE}
            description={UI_TEXT.EMPTY_STATE.DESCRIPTION}
          />
        )}

        {!loading && prompts.length > 0 && (
          <PromptTable
            prompts={prompts}
            onEdit={startEdit}
            onDelete={onDelete}
          />
        )}
      </main>
    </div>
  );
}
