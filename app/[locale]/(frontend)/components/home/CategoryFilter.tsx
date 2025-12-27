'use client';

/**
 * CategoryFilter Component
 * Filter buttons for generation type categories
 * Enhanced with modern badge styling
 */

import { FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CategoryFilterProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  const t = useTranslations('filter');

  if (categories.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FolderOpen className="w-4 h-4" />
        <span>{t('categories')}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelect('')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
            !selected
              ? 'bg-primary/10 text-primary border border-primary/30 shadow-glow'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
          }`}
        >
          {t('all')}
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              selected === category
                ? 'bg-primary/10 text-primary border border-primary/30 shadow-glow'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}
