/**
 * useWorkerSearch Hook
 * Uses Web Worker for background search processing
 * Falls back to main thread if Web Workers are not supported
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { PromptItem } from '@/types';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useWorkerSearch(prompts: PromptItem[], onFilterChange?: () => void) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedModelTag, setSelectedModelTag] = useState<string>('');
  const [filteredResults, setFilteredResults] = useState<PromptItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Worker reference
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const promptsRef = useRef<PromptItem[]>([]);

  // Initialize worker
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Worker) {
      try {
        workerRef.current = new Worker('/workers/search-worker.js');
        
        workerRef.current.onmessage = (e) => {
          const { type, results, requestId } = e.data;
          
          if (type === 'searchResult') {
            // Only process if this is the latest request
            if (requestId === requestIdRef.current) {
              const filteredPrompts = results.map((idx: number) => promptsRef.current[idx]);
              setFilteredResults(filteredPrompts);
              setIsSearching(false);
            }
          }
        };

        workerRef.current.onerror = (error) => {
          console.error('Search worker error:', error);
          setIsSearching(false);
        };
      } catch {
        console.warn('Failed to initialize search worker, using fallback');
        workerRef.current = null;
      }
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Update prompts reference and rebuild index when prompts change
  useEffect(() => {
    promptsRef.current = prompts;
    
    if (workerRef.current && prompts.length > 0) {
      workerRef.current.postMessage({
        type: 'buildIndex',
        data: { prompts }
      });
    }
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

  // Fallback main-thread search
  const performMainThreadSearch = useCallback(() => {
    if (!prompts || prompts.length === 0) {
      setFilteredResults([]);
      return;
    }

    const searchLower = debouncedSearchTerm.toLowerCase();
    const hasSearch = searchLower.length > 0;
    const hasTag = selectedTag !== '';
    const hasCategory = selectedCategory !== '';
    const hasModelTag = selectedModelTag !== '';

    if (!hasSearch && !hasTag && !hasCategory && !hasModelTag) {
      setFilteredResults(prompts);
      return;
    }

    const results: PromptItem[] = [];

    for (const prompt of prompts) {
      if (hasTag && (!prompt.tags || !prompt.tags.includes(selectedTag))) {
        continue;
      }
      if (hasCategory && prompt.category !== selectedCategory) {
        continue;
      }
      if (hasModelTag && (!prompt.modelTags || !prompt.modelTags.includes(selectedModelTag))) {
        continue;
      }
      if (hasSearch) {
        const effectLower = (prompt.effect || '').toLowerCase();
        const descLower = (prompt.description || '').toLowerCase();
        const promptLower = (prompt.prompt || '').toLowerCase();
        
        if (effectLower.indexOf(searchLower) === -1 &&
            descLower.indexOf(searchLower) === -1 &&
            promptLower.indexOf(searchLower) === -1) {
          continue;
        }
      }
      results.push(prompt);
    }

    setFilteredResults(results);
    setIsSearching(false);
  }, [prompts, debouncedSearchTerm, selectedTag, selectedCategory, selectedModelTag]);

  // Perform search (worker or fallback)
  useEffect(() => {
    setIsSearching(true);
    requestIdRef.current += 1;

    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'search',
        data: {
          searchTerm: debouncedSearchTerm,
          selectedTag,
          selectedCategory,
          selectedModelTag,
          requestId: requestIdRef.current
        }
      });
    } else {
      // Fallback to main thread
      performMainThreadSearch();
    }
  }, [debouncedSearchTerm, selectedTag, selectedCategory, selectedModelTag, performMainThreadSearch]);

  // Notify filter changes immediately
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
    isSearching,
  };
}
