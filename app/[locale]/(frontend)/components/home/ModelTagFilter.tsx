'use client';

/**
 * ModelTagFilter Component
 * Filter buttons for AI model tags
 * Enhanced with modern badge styling and colors
 */

import { Cpu } from 'lucide-react';
import { getModelTagColor } from '@/config/theme';
import { useTranslations } from 'next-intl';

interface ModelTagFilterProps {
  modelTags: string[];
  selected: string;
  onSelect: (modelTag: string) => void;
}

export default function ModelTagFilter({ modelTags, selected, onSelect }: ModelTagFilterProps) {
  const t = useTranslations('filter');

  if (modelTags.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Cpu className="w-4 h-4" />
        <span>{t('models')}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelect('')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
            !selected
              ? 'bg-secondary/10 text-secondary border border-secondary/30 shadow-glow'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          {t('all')}
        </button>
        {modelTags.map((modelTag) => {
          const color = getModelTagColor(modelTag);
          const isSelected = selected === modelTag;
          return (
            <button
              key={modelTag}
              onClick={() => onSelect(modelTag)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
                isSelected
                  ? 'shadow-glow'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
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
    </div>
  );
}
