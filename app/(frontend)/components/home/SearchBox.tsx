'use client';

/**
 * SearchBox Component
 * Search input for filtering prompts
 */

import { Search } from 'lucide-react';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBox({ value, onChange }: SearchBoxProps) {
  return (
    <div className="relative max-w-2xl mx-auto group">
      {/* Search box glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-primary/50 to-tech-accent/50 rounded-2xl opacity-20 group-hover:opacity-50 transition duration-500 blur-lg"></div>
      <div className="relative flex items-center bg-dark-900/80 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl group-hover:border-white/20 transition-all duration-300">
        <Search className="absolute left-4 text-gray-500 w-5 h-5 group-focus-within:text-tech-primary transition-colors" />
        <input
          type="text"
          placeholder="搜索提示词、效果或描述..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 rounded-xl focus:outline-none text-lg"
        />
      </div>
    </div>
  );
}

