'use client';

/**
 * SearchBox Component
 * Search input for filtering prompts
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
      {/* Search box glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-primary/50 to-tech-accent/50 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur-lg"></div>
      <div className="relative flex items-center bg-dark-900/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl group-hover:border-white/20 transition-all duration-300">
        <Search className="absolute left-6 text-gray-500 w-6 h-6 group-focus-within:text-tech-primary transition-colors" />
        <input
          type="text"
          placeholder={t('placeholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-16 pr-6 py-5 bg-transparent text-white placeholder-gray-500 rounded-2xl focus:outline-none text-lg"
        />
      </div>
    </div>
  );
}
