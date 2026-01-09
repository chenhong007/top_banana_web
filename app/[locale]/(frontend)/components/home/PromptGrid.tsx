'use client';

/**
 * PromptGrid Component
 * Grid display for prompt cards with pagination
 * Enhanced with fade-in animations
 */

import { FileQuestion, Search } from 'lucide-react';
import { useRef, useCallback } from 'react';
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
  onPreview: (src: string, alt: string) => void;
  /** 数据库真实总量（用于显示，而非已加载数量） */
  databaseTotal?: number;
  /** 数据库真实总页数（用于分页显示） */
  databaseTotalPages?: number;
  /** 搜索进行中状态（用于显示搜索指示器） */
  isSearching?: boolean;
  /** 是否启用无限滚动模式（不进行前端分页切割） */
  enableInfiniteScroll?: boolean;
}

export default function PromptGrid({ 
  loading, 
  filteredPrompts, 
  pagination, 
  onPreview, 
  databaseTotal, 
  databaseTotalPages, 
  isSearching,
  enableInfiniteScroll = false
}: PromptGridProps) {
  const t = useTranslations('empty');
  const tLoading = useTranslations('loading');
  const tPagination = useTranslations('pagination');
  const gridRef = useRef<HTMLDivElement>(null);

  // Scroll to top of grid when page changes
  const scrollToTop = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Wrap page change handler to scroll to top
  const handlePageChange = useCallback((page: number) => {
    pagination.goToPage(page);
    // Use setTimeout to ensure the DOM has updated before scrolling
    setTimeout(scrollToTop, 100);
  }, [pagination, scrollToTop]);

  // Wrap page size change handler to scroll to top
  const handlePageSizeChange = useCallback((size: number) => {
    pagination.changePageSize(size);
    setTimeout(scrollToTop, 100);
  }, [pagination, scrollToTop]);

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
    <div ref={gridRef} className="space-y-8 scroll-mt-4">
      {/* Results count - 显示数据库真实总量 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {tPagination('total', { count: databaseTotal ?? filteredPrompts.length })}
          </p>
          {/* 搜索进行中指示器 */}
          {isSearching && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
              <Search className="w-3 h-3" />
              <span>{tLoading('searching')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(enableInfiniteScroll ? filteredPrompts : pagination.paginatedItems).map((prompt, index) => (
          <PromptCard 
            key={prompt.id} 
            prompt={prompt} 
            index={index}
            // 首屏前12张图片最高优先级加载（覆盖4行，确保首屏快速显示）
            priority={pagination.currentPage === 1 && index < 12}
            onPreview={onPreview}
          />
        ))}
      </div>

      {/* Pagination - 使用数据库真实总量和总页数 */}
      {/* 如果启用了无限滚动，且还有更多数据，则隐藏分页组件（使用无限滚动加载器） */}
      {/* 只有在非无限滚动模式，或者没有更多数据时（作为底部导航）才显示分页 */}
      {!enableInfiniteScroll && (databaseTotalPages ?? pagination.totalPages) > 1 && (
        <div className="flex justify-center pt-8">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={databaseTotalPages ?? pagination.totalPages}
            totalItems={databaseTotal ?? pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            hasNextPage={databaseTotalPages ? pagination.currentPage < databaseTotalPages : pagination.hasNextPage}
            hasPreviousPage={pagination.hasPreviousPage}
          />
        </div>
      )}
    </div>
  );
}
