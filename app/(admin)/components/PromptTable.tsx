/**
 * PromptTable Component
 * Table for displaying and managing prompts
 */

import { PromptItem } from '@/types';
import { Edit2, Trash2, Search, Filter } from 'lucide-react';
import { CARD_STYLES, TABLE_STYLES, ICON_BUTTON_STYLES, BADGE_STYLES, INPUT_STYLES } from '@/lib/styles';
import { useState } from 'react';

interface PromptTableProps {
  prompts: PromptItem[];
  onEdit: (prompt: PromptItem) => void;
  onDelete: (id: string) => void;
}

export default function PromptTable({ prompts, onEdit, onDelete }: PromptTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPrompts = prompts.filter(p => 
    (p.effect || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.tags || []).some(t => (t || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
                      {(prompt.tags || []).map((tag, idx) => {
                        const styles = [
                          BADGE_STYLES.primary,
                          BADGE_STYLES.success,
                          BADGE_STYLES.warning, 
                          BADGE_STYLES.neutral
                        ];
                        // Deterministic random color based on tag string length
                        const style = styles[tag.length % styles.length];
                        
                        return (
                          <span key={tag} className={style}>
                            {tag}
                          </span>
                        );
                      })}
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
      
      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500 flex justify-between items-center">
        <span>显示 {filteredPrompts.length} 条记录</span>
        <div className="flex gap-1">
          <span className="px-2 py-1 rounded hover:bg-gray-200 cursor-pointer">上一页</span>
          <span className="px-2 py-1 rounded bg-white border shadow-sm font-medium text-blue-600">1</span>
          <span className="px-2 py-1 rounded hover:bg-gray-200 cursor-pointer">下一页</span>
        </div>
      </div>
    </div>
  );
}

