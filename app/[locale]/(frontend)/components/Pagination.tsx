'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULTS } from '@/lib/constants';
import { useTranslations } from 'next-intl';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const PAGE_SIZE_OPTIONS = DEFAULTS.PAGE_SIZE_OPTIONS;

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  hasNextPage,
  hasPreviousPage,
}: PaginationProps) {
  const t = useTranslations('pagination');

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 glass-card p-6">
      {/* Page Size Selector */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{t('perPage')}</span>
        <div className="relative group">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="appearance-none bg-muted border border-border text-foreground px-4 py-1.5 rounded-lg focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all pr-8 cursor-pointer hover:bg-muted/80"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
        <span>{t('items')}</span>
        <span className="ml-2 px-3 py-1 bg-muted rounded-full text-muted-foreground border border-border">
          {t('total', { count: totalItems })}
        </span>
      </div>

      {/* Page Numbers */}
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            hasPreviousPage
              ? 'bg-muted text-foreground hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30'
              : 'bg-muted/50 text-muted-foreground cursor-not-allowed border border-transparent opacity-50'
          }`}
          title={t('previous')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center bg-muted rounded-xl p-1 border border-border">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={`min-w-[40px] h-10 px-3 rounded-lg font-medium transition-all duration-300 ${
                page === currentPage
                  ? 'bg-primary text-primary-foreground shadow-glow scale-105'
                  : page === '...'
                  ? 'cursor-default text-muted-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            hasNextPage
              ? 'bg-muted text-foreground hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30'
              : 'bg-muted/50 text-muted-foreground cursor-not-allowed border border-transparent opacity-50'
          }`}
          title={t('next')}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
