'use client';

/**
 * TagFilter Component
 * Filter buttons for scene/use-case tags
 */

import { Tag } from 'lucide-react';

interface TagFilterProps {
  tags: string[];
  selected: string;
  onSelect: (tag: string) => void;
}

export default function TagFilter({ tags, selected, onSelect }: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
        <Tag className="w-4 h-4" />
        <span>按场景标签筛选</span>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => onSelect('')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
            !selected
              ? 'bg-tech-primary/10 border-tech-primary/50 text-tech-primary shadow-[0_0_15px_-3px_rgba(56,189,248,0.2)]'
              : 'bg-dark-800/50 border-white/5 text-gray-400 hover:border-white/20 hover:text-white hover:bg-white/5'
          }`}
        >
          全部标签
        </button>
        {tags.filter(t => t).map((tag, idx) => (
          <button
            key={tag || idx}
            onClick={() => onSelect(tag)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
              selected === tag
                ? 'bg-tech-primary/10 border-tech-primary/50 text-tech-primary shadow-[0_0_15px_-3px_rgba(56,189,248,0.2)]'
                : 'bg-dark-800/50 border-white/5 text-gray-400 hover:border-white/20 hover:text-white hover:bg-white/5'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

