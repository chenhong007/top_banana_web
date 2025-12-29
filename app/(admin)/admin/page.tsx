'use client';

import { FolderOpen } from 'lucide-react';
import { useState } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';
import ImportModal from '../components/ImportModal';
import AdminHeader from '../components/AdminHeader';
import PromptForm from '../components/PromptForm';
import PromptTable from '../components/PromptTable';
import DashboardStats from '../components/DashboardStats';
import { useAdminPrompts } from '@/hooks/useAdminPrompts';
import { useCategoriesQuery } from '@/hooks/queries';
import { UI_TEXT } from '@/lib/constants';
import { CONTAINER_STYLES } from '@/lib/styles';

export default function AdminPage() {
  const {
    prompts,
    loading,
    refetch,
    // 分页相关
    pagination,
    currentPage,
    goToPage,
    nextPage,
    prevPage,
    // 缺失类型筛选
    missingType,
    setMissingType,
    // 表单相关
    formData,
    setFormData,
    isCreating,
    submitting,
    isEditing,
    startCreate,
    startEdit,
    cancelEdit,
    onSubmit,
    onDelete,
    handleTagsChange,
    handleModelTagsChange,
  } = useAdminPrompts();

  const [showImportModal, setShowImportModal] = useState(false);
  const { data: categories = [] } = useCategoriesQuery();

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

        {/* Stats Section - 传递数据库真实总量和缺失类型筛选 */}
        {!loading && (
          <DashboardStats 
            prompts={prompts} 
            totalCount={pagination.total}
            selectedMissingType={missingType}
            onMissingTypeChange={setMissingType}
          />
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

        {!loading && prompts.length === 0 && !missingType && (
          <EmptyState
            icon={<FolderOpen className="w-16 h-16 text-gray-300" />}
            title={UI_TEXT.EMPTY_STATE.TITLE}
            description={UI_TEXT.EMPTY_STATE.DESCRIPTION}
          />
        )}

        {!loading && prompts.length === 0 && missingType && (
          <EmptyState
            icon={<FolderOpen className="w-16 h-16 text-gray-300" />}
            title="没有匹配的数据"
            description="当前筛选条件下没有找到符合的提示词"
          />
        )}

        {!loading && prompts.length > 0 && (
          <PromptTable
            prompts={prompts}
            onEdit={startEdit}
            onDelete={onDelete}
            pagination={pagination}
            currentPage={currentPage}
            onPageChange={goToPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
          />
        )}
      </main>
    </div>
  );
}
