/**
 * useSearch Hook
 * Manages search and filter logic
 */

import { useState, useMemo, useEffect } from 'react';
import { PromptItem } from '@/types';

export function useSearch(prompts: PromptItem[], onFilterChange?: () => void) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Get all unique tags
  const allTags = useMemo(() => {
    if (!prompts) return [];
    return Array.from(
      new Set(prompts.flatMap(p => p.tags || []))
    ).sort();
  }, [prompts]);

  // Filter prompts based on search and tag
  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];
    return prompts.filter(prompt => {
      const matchesSearch = 
        (prompt.effect || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prompt.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prompt.prompt || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTag = !selectedTag || (prompt.tags || []).includes(selectedTag);
      
      return matchesSearch && matchesTag;
    });
  }, [prompts, searchTerm, selectedTag]);

  // Notify when filters change
  useEffect(() => {
    onFilterChange?.();
  }, [searchTerm, selectedTag, onFilterChange]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTag('');
  };

  return {
    searchTerm,
    setSearchTerm,
    selectedTag,
    setSelectedTag,
    allTags,
    filteredPrompts,
    clearFilters,
    hasFilters: searchTerm !== '' || selectedTag !== '',
  };
}

