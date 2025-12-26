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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-dark-800/50 backdrop-blur-md rounded-2xl p-6 border border-white/5">
      {/* Page Size Selector */}
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <span>{t('perPage')}</span>
        <div className="relative group">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="appearance-none bg-dark-900 border border-white/10 text-white px-4 py-1.5 rounded-lg focus:outline-none focus:border-tech-blue/50 focus:ring-1 focus:ring-tech-blue/50 transition-all pr-8 cursor-pointer hover:bg-dark-700"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
        <span>{t('items')}</span>
        <span className="ml-2 px-3 py-1 bg-white/5 rounded-full text-gray-400 border border-white/5">
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
              ? 'bg-dark-900 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5 hover:border-white/20'
              : 'bg-dark-900/50 text-gray-600 cursor-not-allowed border border-transparent'
          }`}
          title={t('previous')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center bg-dark-900 rounded-xl p-1 border border-white/5">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={`min-w-[40px] h-10 px-3 rounded-lg font-medium transition-all duration-300 ${
                page === currentPage
                  ? 'bg-gradient-to-br from-tech-blue to-tech-blue/80 text-dark-900 shadow-lg shadow-tech-blue/20 scale-105'
                  : page === '...'
                  ? 'cursor-default text-gray-600'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
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
              ? 'bg-dark-900 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5 hover:border-white/20'
              : 'bg-dark-900/50 text-gray-600 cursor-not-allowed border border-transparent'
          }`}
          title={t('next')}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
