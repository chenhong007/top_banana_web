'use client';

/**
 * Sidebar Component
 * 左侧导航栏，包含生成类型和AI模型筛选
 */

import { FolderOpen, Cpu, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { getModelTagColor } from '@/config/theme';

interface SidebarProps {
  // 生成类型
  categories: string[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  // AI模型
  modelTags: string[];
  selectedModelTag: string;
  onModelTagSelect: (modelTag: string) => void;
}

export default function Sidebar({
  categories,
  selectedCategory,
  onCategorySelect,
  modelTags,
  selectedModelTag,
  onModelTagSelect,
}: SidebarProps) {
  const [categoryExpanded, setCategoryExpanded] = useState(true);
  const [modelExpanded, setModelExpanded] = useState(true);

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="sticky top-24 space-y-6">
        {/* 生成类型筛选 */}
        {categories.length > 0 && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <button
              onClick={() => setCategoryExpanded(!categoryExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>生成类型</span>
              </div>
              {categoryExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {categoryExpanded && (
              <div className="p-3 space-y-1.5">
                <button
                  onClick={() => onCategorySelect('')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    !selectedCategory
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  全部类型
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => onCategorySelect(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI模型筛选 */}
        {modelTags.length > 0 && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <button
              onClick={() => setModelExpanded(!modelExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>AI 模型</span>
              </div>
              {modelExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {modelExpanded && (
              <div className="p-3 space-y-1.5 max-h-[50vh] overflow-y-auto scrollbar-hide">
                <button
                  onClick={() => onModelTagSelect('')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    !selectedModelTag
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  全部模型
                </button>
                {modelTags.map((modelTag) => {
                  const color = getModelTagColor(modelTag);
                  const isSelected = selectedModelTag === modelTag;
                  return (
                    <button
                      key={modelTag}
                      onClick={() => onModelTagSelect(modelTag)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        isSelected
                          ? ''
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: `${color}20`,
                              borderWidth: '1px',
                              borderColor: `${color}50`,
                              color: color,
                            }
                          : {}
                      }
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      {modelTag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

