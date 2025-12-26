'use client';

/**
 * ModelTagFilter Component
 * Filter buttons for AI model tags
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
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <Cpu className="w-4 h-4" />
        <span>{t('models')}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => onSelect('')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
            !selected
              ? 'bg-purple-500/10 border-purple-500/50 text-purple-400 shadow-[0_0_15px_-3px_rgba(168,85,247,0.2)]'
              : 'bg-dark-800/50 border-white/5 text-gray-400 hover:border-white/20 hover:text-white hover:bg-white/5'
          }`}
        >
          {t('all')}
        </button>
        {modelTags.map((modelTag) => {
          const color = getModelTagColor(modelTag);
          const isSelected = selected === modelTag;
          return (
            <button
              key={modelTag}
              onClick={() => onSelect(modelTag)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 border flex items-center gap-1.5 ${
                isSelected
                  ? 'shadow-[0_0_15px_-3px_rgba(168,85,247,0.3)]'
                  : 'bg-dark-800/50 border-white/5 text-gray-400 hover:border-white/20 hover:text-white hover:bg-white/5'
              }`}
              style={
                isSelected
                  ? {
                      backgroundColor: `${color}20`,
                      borderColor: `${color}80`,
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
