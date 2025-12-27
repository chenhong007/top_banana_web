'use client';

/**
 * SearchBox Component
 * Search input for filtering prompts
 * Enhanced with modern glass effect and animations
 */

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBox({ value, onChange }: SearchBoxProps) {
  const t = useTranslations('search');

  return (
    <div className="relative w-full group">
      {/* Glow effect on hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition duration-500 blur-lg" />
      
      <div className="relative flex items-center glass-card border-border/50 group-hover:border-primary/30 group-focus-within:border-primary/50 transition-all duration-300">
        <Search className="absolute left-4 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder={t('placeholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-transparent text-foreground placeholder-muted-foreground rounded-xl focus:outline-none"
        />
      </div>
    </div>
  );
}
