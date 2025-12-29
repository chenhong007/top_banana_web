/**
 * PromptTable Component
 * Table for displaying and managing prompts
 * 支持分页功能以优化大数据量下的性能
 */

import { PromptItem } from '@/types';
import { Edit2, Trash2, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { CARD_STYLES, TABLE_STYLES, ICON_BUTTON_STYLES, BADGE_STYLES, INPUT_STYLES, BUTTON_STYLES } from '@/lib/styles';
import { useState } from 'react';

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PromptTableProps {
  prompts: PromptItem[];
  onEdit: (prompt: PromptItem) => void;
  onDelete: (id: string) => void;
  // 分页相关属性（可选，支持向后兼容）
  pagination?: PaginationInfo;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
}

export default function PromptTable({ 
  prompts, 
  onEdit, 
  onDelete,
  pagination,
  currentPage = 1,
  onPageChange,
  onNextPage,
  onPrevPage,
}: PromptTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // 本地搜索过滤（在当前页数据中搜索）
  const filteredPrompts = prompts.filter(p => 
    (p.effect || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.tags || []).some(t => (t || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 是否启用分页
  const hasPagination = !!pagination && !!onPageChange;

  // 生成页码按钮数组
  const getPageNumbers = () => {
    if (!pagination) return [1];
    const { totalPages } = pagination;
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      // 显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 显示部分页码 + 省略号
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className={CARD_STYLES.base}>
      {/* Table Header / Toolbar */}
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50">
        <h3 className="text-lg font-semibold text-gray-900">提示词列表</h3>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="搜索提示词..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${INPUT_STYLES.base} pl-10 py-2 text-sm rounded-full`}
            />
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={TABLE_STYLES.header}>标题</th>
              <th className={TABLE_STYLES.header}>详细描述</th>
              <th className={TABLE_STYLES.header}>标签分类</th>
              <th className={TABLE_STYLES.header}>更新时间</th>
              <th className={`${TABLE_STYLES.header} text-right`}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredPrompts.length > 0 ? (
              filteredPrompts.map(prompt => (
                <tr key={prompt.id} className={TABLE_STYLES.row}>
                  <td className={TABLE_STYLES.cell}>
                    <div className="font-semibold text-gray-900">{prompt.effect}</div>
                  </td>
                  <td className={TABLE_STYLES.cell}>
                    <div className={`${TABLE_STYLES.cellText} line-clamp-2 max-w-md text-gray-500`}>
                      {prompt.description}
                    </div>
                  </td>
                  <td className={TABLE_STYLES.cell}>
                    <div className="flex flex-wrap gap-1.5">
                      {(prompt.tags || []).filter(tag => tag).map((tag, idx) => (
                        <span key={tag || idx} className={BADGE_STYLES.primary}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={TABLE_STYLES.cell}>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-600">
                        {prompt.updatedAt && !isNaN(new Date(prompt.updatedAt).getTime())
                          ? new Date(prompt.updatedAt).toLocaleDateString('zh-CN')
                          : '-'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {prompt.updatedAt && !isNaN(new Date(prompt.updatedAt).getTime())
                          ? new Date(prompt.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>
                  </td>
                  <td className={TABLE_STYLES.cell}>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onEdit(prompt)}
                        className={ICON_BUTTON_STYLES.primary}
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(prompt.id)}
                        className={ICON_BUTTON_STYLES.danger}
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 text-gray-300" />
                    <p>没有找到匹配的提示词</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer with Pagination */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 text-sm text-gray-600 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span>
            {hasPagination ? (
              <>
                显示第 {(currentPage - 1) * (pagination?.pageSize || 50) + 1} - {Math.min(currentPage * (pagination?.pageSize || 50), pagination?.total || 0)} 条，
                共 <span className="font-semibold text-gray-900">{pagination?.total?.toLocaleString()}</span> 条记录
              </>
            ) : (
              <>显示 {filteredPrompts.length} 条记录</>
            )}
          </span>
        </div>
        
        {hasPagination && pagination && (
          <div className="flex items-center gap-1">
            {/* 首页 */}
            <button
              onClick={() => onPageChange?.(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="首页"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            
            {/* 上一页 */}
            <button
              onClick={onPrevPage}
              disabled={!pagination.hasPrev}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="上一页"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* 页码 */}
            <div className="flex gap-1 mx-2">
              {getPageNumbers().map((page, idx) => (
                typeof page === 'number' ? (
                  <button
                    key={idx}
                    onClick={() => onPageChange?.(page)}
                    className={`min-w-[36px] h-9 px-3 rounded-lg font-medium transition-colors ${
                      page === currentPage
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ) : (
                  <span key={idx} className="px-2 py-2 text-gray-400">
                    {page}
                  </span>
                )
              ))}
            </div>
            
            {/* 下一页 */}
            <button
              onClick={onNextPage}
              disabled={!pagination.hasNext}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="下一页"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            {/* 末页 */}
            <button
              onClick={() => onPageChange?.(pagination.totalPages)}
              disabled={currentPage === pagination.totalPages}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="末页"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

