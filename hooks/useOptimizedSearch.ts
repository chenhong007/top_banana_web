/**
 * useOptimizedSearch Hook
 * High-performance search with 6+ optimization strategies:
 * 
 * 1. Debounce: Delay search input to reduce frequent re-computations
 * 2. Preprocessed Index: Cache lowercase versions of searchable fields
 * 3. Early Termination: Skip remaining checks once a match is found
 * 4. useTransition: Mark search as non-urgent update for better UI responsiveness
 * 5. Memoized Search Index: Avoid recreating search index on every render
 * 6. Optimized String Matching: Use indexOf instead of includes for faster matching
 */

import { useState, useMemo, useEffect, useTransition, useCallback, useRef } from 'react';
import { PromptItem } from '@/types';

// Debounce hook for search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Preprocessed search index for each prompt
interface SearchIndex {
  id: string;
  // Lowercase cached strings for fast matching
  effectLower: string;
  descriptionLower: string;
  promptLower: string;
  // Original reference
  original: PromptItem;
}

export function useOptimizedSearch(prompts: PromptItem[], onFilterChange?: () => void) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedModelTag, setSelectedModelTag] = useState<string>('');
  
  // Optimization 1: Debounce search input (300ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Optimization 4: useTransition for non-blocking UI updates
  const [isPending, startTransition] = useTransition();
  const [filteredResults, setFilteredResults] = useState<PromptItem[]>([]);

  // Optimization 2 & 5: Preprocessed search index with memoization
  // This creates a cached lowercase version of all searchable fields
  const searchIndex = useMemo<SearchIndex[]>(() => {
    if (!prompts || prompts.length === 0) return [];
    
    return prompts.map(prompt => ({
      id: prompt.id,
      effectLower: (prompt.effect || '').toLowerCase(),
      descriptionLower: (prompt.description || '').toLowerCase(),
      promptLower: (prompt.prompt || '').toLowerCase(),
      original: prompt,
    }));
  }, [prompts]);

  // Cache for unique tags, categories, and model tags
  const allTags = useMemo(() => {
    if (!prompts) return [];
    const tagSet = new Set<string>();
    for (const p of prompts) {
      if (p.tags) {
        for (const t of p.tags) {
          if (t) tagSet.add(t);
        }
      }
    }
    return Array.from(tagSet).sort();
  }, [prompts]);

  const allCategories = useMemo(() => {
    if (!prompts) return [];
    const catSet = new Set<string>();
    for (const p of prompts) {
      if (p.category) catSet.add(p.category);
    }
    return Array.from(catSet).sort();
  }, [prompts]);

  const allModelTags = useMemo(() => {
    if (!prompts) return [];
    const modelSet = new Set<string>();
    for (const p of prompts) {
      if (p.modelTags) {
        for (const t of p.modelTags) {
          if (t) modelSet.add(t);
        }
      }
    }
    return Array.from(modelSet).sort();
  }, [prompts]);

  // Optimization 3 & 6: Fast search with early termination and indexOf
  const performSearch = useCallback(() => {
    if (!searchIndex || searchIndex.length === 0) {
      setFilteredResults([]);
      return;
    }

    const searchLower = debouncedSearchTerm.toLowerCase();
    const hasSearch = searchLower.length > 0;
    const hasTag = selectedTag !== '';
    const hasCategory = selectedCategory !== '';
    const hasModelTag = selectedModelTag !== '';

    // Fast path: no filters applied
    if (!hasSearch && !hasTag && !hasCategory && !hasModelTag) {
      setFilteredResults(prompts);
      return;
    }

    const results: PromptItem[] = [];

    for (let i = 0; i < searchIndex.length; i++) {
      const indexed = searchIndex[i];
      const prompt = indexed.original;

      // Optimization 3: Early termination pattern
      // Check cheapest conditions first, skip item on first failure

      // Tag filter (array lookup - medium cost)
      if (hasTag) {
        const tags = prompt.tags;
        if (!tags || !tags.includes(selectedTag)) {
          continue;
        }
      }

      // Category filter (string comparison - cheap)
      if (hasCategory && prompt.category !== selectedCategory) {
        continue;
      }

      // Model tag filter (array lookup - medium cost)
      if (hasModelTag) {
        const modelTags = prompt.modelTags;
        if (!modelTags || !modelTags.includes(selectedModelTag)) {
          continue;
        }
      }

      // Text search (most expensive - do last)
      // Optimization 6: Use indexOf for potentially faster matching
      if (hasSearch) {
        // Early termination: stop checking on first match
        const matchesEffect = indexed.effectLower.indexOf(searchLower) !== -1;
        if (!matchesEffect) {
          const matchesDesc = indexed.descriptionLower.indexOf(searchLower) !== -1;
          if (!matchesDesc) {
            const matchesPrompt = indexed.promptLower.indexOf(searchLower) !== -1;
            if (!matchesPrompt) {
              continue;
            }
          }
        }
      }

      results.push(prompt);
    }

    setFilteredResults(results);
  }, [searchIndex, prompts, debouncedSearchTerm, selectedTag, selectedCategory, selectedModelTag]);

  // Run search with useTransition for non-blocking updates
  useEffect(() => {
    startTransition(() => {
      performSearch();
    });
  }, [performSearch]);

  // Notify filter changes immediately (for pagination reset)
  useEffect(() => {
    onFilterChange?.();
  }, [searchTerm, selectedTag, selectedCategory, selectedModelTag, onFilterChange]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedTag('');
    setSelectedCategory('');
    setSelectedModelTag('');
  }, []);

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
    filteredPrompts: filteredResults,
    clearFilters,
    hasFilters: searchTerm !== '' || selectedTag !== '' || selectedCategory !== '' || selectedModelTag !== '',
    // Expose pending state for showing loading indicator
    isSearching: isPending,
    debouncedSearchTerm,
  };
}
