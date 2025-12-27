'use client';

/**
 * Sidebar Component
 * 左侧导航栏，包含生成类型和AI模型筛选
 */

import { FolderOpen, Cpu, Sparkles, LayoutGrid } from 'lucide-react';
import { getModelTagColor } from '@/config/theme';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('sidebar');
  const tFilter = useTranslations('filter');

  const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-20 space-y-6">
        {/* 生成类型筛选 */}
        {categories.length > 0 && (
          <div className="glass-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              {t('categories')}
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => onCategorySelect('')}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  !selectedCategory
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                {tFilter('all')}
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategorySelect(category)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    selectedCategory === category
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <FolderOpen className="h-4 w-4" />
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI模型筛选 */}
        {modelTags.length > 0 && (
          <div className="glass-card p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-secondary" />
              {t('models')}
            </h3>
            <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin">
              <button
                onClick={() => onModelTagSelect('')}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  !selectedModelTag
                    ? "bg-secondary/10 text-secondary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tFilter('all')}
              </button>
              {modelTags.map((modelTag) => {
                const color = getModelTagColor(modelTag);
                const isSelected = selectedModelTag === modelTag;
                return (
                  <button
                    key={modelTag}
                    onClick={() => onModelTagSelect(modelTag)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      isSelected
                        ? "bg-secondary/10 text-secondary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    {modelTag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
