'use client';

/**
 * TagFilter Component
 * Filter buttons for scene/use-case tags
 * Enhanced with modern badge styling
 */

import { Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TagFilterProps {
  tags: string[];
  selected: string;
  onSelect: (tag: string) => void;
}

export default function TagFilter({ tags, selected, onSelect }: TagFilterProps) {
  const t = useTranslations('filter');

  if (tags.length === 0) return null;

  const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Tag className="h-4 w-4" />
        {t('tags')}:
      </span>
      
      {/* "All" button */}
      <button
        onClick={() => onSelect('')}
        className={cn(
          "tag-badge transition-all text-sm px-4 py-1.5",
          selected === ''
            ? "tag-badge-primary"
            : "hover:bg-primary/10 hover:text-primary"
        )}
      >
        {t('all')}
      </button>

      {tags.slice(0, 12).map((tag) => (
        <button
          key={tag}
          onClick={() => onSelect(tag === selected ? '' : tag)}
          className={cn(
            "tag-badge transition-all text-sm px-4 py-1.5",
            tag === selected
              ? "tag-badge-primary"
              : "hover:bg-primary/10 hover:text-primary"
          )}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
