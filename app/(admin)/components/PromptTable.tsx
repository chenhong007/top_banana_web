/**
 * PromptTable Component
 * Table for displaying and managing prompts
 * 支持分页功能以优化大数据量下的性能
 * 支持图片悬停预览
 */

import { PromptItem } from '@/types';
import { Edit2, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { CARD_STYLES, TABLE_STYLES, ICON_BUTTON_STYLES, BADGE_STYLES, INPUT_STYLES } from '@/lib/styles';
import { useState, useRef } from 'react';

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

// 图片预览 Tooltip 组件
function ImagePreviewTooltip({ 
  imageUrl, 
  imageUrls,
  isVisible, 
  position 
}: { 
  imageUrl?: string;
  imageUrls?: string[];
  isVisible: boolean;
  position: { x: number; y: number };
}) {
  if (!isVisible) return null;
  
  // 获取所有图片
  const allImages: string[] = [];
  if (imageUrls && imageUrls.length > 0) {
    allImages.push(...imageUrls.filter(url => url && url.trim()));
  } else if (imageUrl && imageUrl.trim()) {
    allImages.push(imageUrl);
  }

  if (allImages.length === 0) return null;

  // 只显示前4张图片
  const displayImages = allImages.slice(0, 4);
  const remainingCount = allImages.length - 4;

  return (
    <div 
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 pointer-events-none"
      style={{ 
        left: position.x + 10, 
        top: position.y - 80,
        maxWidth: '320px',
      }}
    >
      <div className={`grid gap-2 ${displayImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {displayImages.map((url, index) => (
          <div key={index} className="relative">
            <img 
              src={url} 
              alt={`Preview ${index + 1}`}
              className="w-36 h-36 object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-image.png';
              }}
            />
            {/* 标记是否是 R2 图片 */}
            {!isR2Image(url) && (
              <div className="absolute top-1 right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" />
                非R2
              </div>
            )}
          </div>
        ))}
      </div>
      {remainingCount > 0 && (
        <div className="text-xs text-gray-500 text-center mt-2">
          还有 {remainingCount} 张图片...
        </div>
      )}
      <div className="absolute -bottom-2 left-4 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45"></div>
    </div>
  );
}

// 判断是否是 R2 图片
function isR2Image(url: string): boolean {
  if (!url) return false;
  const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_CDN_URL || '';
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    return true;
  }
  if (url.includes('/api/images/')) {
    return true;
  }
  // 检查常见的 R2 URL 模式
  if (url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com')) {
    return true;
  }
  return false;
}

// 获取图片状态
function getImageStatus(imageUrl?: string, imageUrls?: string[]): { 
  hasImage: boolean; 
  isR2: boolean; 
  count: number;
} {
  const allImages: string[] = [];
  if (imageUrls && imageUrls.length > 0) {
    allImages.push(...imageUrls.filter(url => url && url.trim()));
  } else if (imageUrl && imageUrl.trim()) {
    allImages.push(imageUrl);
  }

  if (allImages.length === 0) {
    return { hasImage: false, isR2: false, count: 0 };
  }

  const allR2 = allImages.every(url => isR2Image(url));
  return { hasImage: true, isR2: allR2, count: allImages.length };
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
  const [hoveredPromptId, setHoveredPromptId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // 处理鼠标进入标题
  const handleMouseEnter = (promptId: string, event: React.MouseEvent) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt?.imageUrl && (!prompt?.imageUrls || prompt.imageUrls.length === 0)) {
      return; // 没有图片，不显示预览
    }

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPromptId(promptId);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }, 300); // 300ms 延迟，避免快速划过时闪烁
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredPromptId(null);
  };

  // 处理鼠标移动（更新位置）
  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredPromptId) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  const hoveredPrompt = prompts.find(p => p.id === hoveredPromptId);

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
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className={`${TABLE_STYLES.header} w-10`}>
                <ImageIcon className="w-4 h-4" />
              </th>
              <th className={TABLE_STYLES.header}>标题</th>
              <th className={TABLE_STYLES.header}>详细描述</th>
              <th className={TABLE_STYLES.header}>标签分类</th>
              <th className={TABLE_STYLES.header}>更新时间</th>
              <th className={`${TABLE_STYLES.header} text-right`}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredPrompts.length > 0 ? (
              filteredPrompts.map(prompt => {
                const imageStatus = getImageStatus(prompt.imageUrl, prompt.imageUrls);
                return (
                  <tr key={prompt.id} className={TABLE_STYLES.row}>
                    {/* 图片状态指示 */}
                    <td className={TABLE_STYLES.cell}>
                      {imageStatus.hasImage ? (
                        <div 
                          className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                            imageStatus.isR2 ? 'bg-green-50' : 'bg-orange-50'
                          }`}
                          title={imageStatus.isR2 ? `${imageStatus.count}张R2图片` : `${imageStatus.count}张非R2图片`}
                        >
                          {imageStatus.isR2 ? (
                            <ImageIcon className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      ) : (
                        <div 
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100"
                          title="无图片"
                        >
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className={TABLE_STYLES.cell}>
                      <div 
                        className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                        onMouseEnter={(e) => handleMouseEnter(prompt.id, e)}
                        onMouseLeave={handleMouseLeave}
                        onMouseMove={handleMouseMove}
                      >
                        {prompt.effect}
                      </div>
                    </td>
                    <td className={TABLE_STYLES.cell}>
                      <div className={`${TABLE_STYLES.cellText} line-clamp-2 max-w-md text-gray-500`}>
                        {prompt.description}
                      </div>
                    </td>
                    <td className={TABLE_STYLES.cell}>
                      <div className="flex flex-wrap gap-1.5">
                        {(prompt.tags || []).filter(tag => tag).slice(0, 3).map((tag, idx) => (
                          <span key={tag || idx} className={BADGE_STYLES.primary}>
                            {tag}
                          </span>
                        ))}
                        {(prompt.tags || []).length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{(prompt.tags || []).length - 3}
                          </span>
                        )}
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
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
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

      {/* 图片预览 Tooltip */}
      <ImagePreviewTooltip 
        imageUrl={hoveredPrompt?.imageUrl}
        imageUrls={hoveredPrompt?.imageUrls}
        isVisible={!!hoveredPromptId}
        position={tooltipPosition}
      />
    </div>
  );
}
