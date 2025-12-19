/**
 * useSearch Hook
 * Manages search and filter logic
 */

import { useState, useMemo, useEffect } from 'react';
import { PromptItem } from '@/types';

export function useSearch(prompts: PromptItem[], onFilterChange?: () => void) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedModelTag, setSelectedModelTag] = useState<string>('');

  // Get all unique tags (场景/用途标签)
  const allTags = useMemo(() => {
    if (!prompts) return [];
    return Array.from(
      new Set(prompts.flatMap(p => p.tags || []).filter((t): t is string => !!t))
    ).sort();
  }, [prompts]);

  // Get all unique categories (生成类型)
  const allCategories = useMemo(() => {
    if (!prompts) return [];
    return Array.from(
      new Set(prompts.map(p => p.category).filter((c): c is string => !!c))
    ).sort();
  }, [prompts]);

  // Get all unique model tags (AI模型标签)
  const allModelTags = useMemo(() => {
    if (!prompts) return [];
    return Array.from(
      new Set(prompts.flatMap(p => p.modelTags || []).filter((t): t is string => !!t))
    ).sort();
  }, [prompts]);

  // Filter prompts based on search, tag, category, and model tag
  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];
    return prompts.filter(prompt => {
      const matchesSearch = 
        (prompt.effect || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prompt.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prompt.prompt || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTag = !selectedTag || (prompt.tags || []).includes(selectedTag);
      
      const matchesCategory = !selectedCategory || prompt.category === selectedCategory;
      
      const matchesModelTag = !selectedModelTag || (prompt.modelTags || []).includes(selectedModelTag);
      
      return matchesSearch && matchesTag && matchesCategory && matchesModelTag;
    });
  }, [prompts, searchTerm, selectedTag, selectedCategory, selectedModelTag]);

  // Notify when filters change
  useEffect(() => {
    onFilterChange?.();
  }, [searchTerm, selectedTag, selectedCategory, selectedModelTag, onFilterChange]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTag('');
    setSelectedCategory('');
    setSelectedModelTag('');
  };

  return {
    searchTerm,
    setSearchTerm,
    selectedTag,
    setSelectedTag,
    selectedCategory,
    setSelectedCategory,
    selectedModelTag,
    setSelectedModelTag,
    allTags,
    allCategories,
    allModelTags,
    filteredPrompts,
    clearFilters,
    hasFilters: searchTerm !== '' || selectedTag !== '' || selectedCategory !== '' || selectedModelTag !== '',
  };
}

