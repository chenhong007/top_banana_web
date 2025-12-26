'use client';

/**
 * CategoryFilter Component
 * Filter buttons for generation type categories
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
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <FolderOpen className="w-4 h-4" />
        <span>{t('categories')}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => onSelect('')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
            !selected
              ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]'
              : 'bg-dark-800/50 border-white/5 text-gray-400 hover:border-white/20 hover:text-white hover:bg-white/5'
          }`}
        >
          {t('all')}
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
              selected === category
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]'
                : 'bg-dark-800/50 border-white/5 text-gray-400 hover:border-white/20 hover:text-white hover:bg-white/5'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}
