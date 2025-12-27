'use client';

/**
 * PromptGrid Component
 * Grid display for prompt cards with pagination
 * Enhanced with fade-in animations
 */

import { FileQuestion } from 'lucide-react';
import PromptCard from '../PromptCard';
import Pagination from '../Pagination';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';
import { PromptItem } from '@/types';
import { useTranslations } from 'next-intl';

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  paginatedItems: PromptItem[];
  goToPage: (page: number) => void;
  changePageSize: (size: number) => void;
}

interface PromptGridProps {
  loading: boolean;
  filteredPrompts: PromptItem[];
  pagination: PaginationData;
}

export default function PromptGrid({ loading, filteredPrompts, pagination }: PromptGridProps) {
  const t = useTranslations('empty');
  const tLoading = useTranslations('loading');

  // Loading State
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  // Empty State
  if (filteredPrompts.length === 0) {
    return (
      <div className="text-center py-20">
        <EmptyState
          icon={<FileQuestion className="w-20 h-20 text-muted-foreground" />}
          title={t('noResults')}
          description={t('tryOther')}
        />
      </div>
    );
  }

  // Grid with prompts
  return (
    <div className="space-y-8">
      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          找到 <span className="font-semibold text-foreground">{filteredPrompts.length}</span> 个提示词
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pagination.paginatedItems.map((prompt, index) => (
          <PromptCard key={prompt.id} prompt={prompt} index={index} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center pt-8">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.goToPage}
            onPageSizeChange={pagination.changePageSize}
            hasNextPage={pagination.hasNextPage}
            hasPreviousPage={pagination.hasPreviousPage}
          />
        </div>
      )}
    </div>
  );
}
