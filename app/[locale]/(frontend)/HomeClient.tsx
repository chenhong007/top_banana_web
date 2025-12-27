'use client';

/**
 * HomeClient Component
 * Main client component for the home page
 * Refactored to use smaller sub-components and React Query
 * Enhanced with modern glass effects and animations
 */

import { Sparkles, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

// Sub-components
import {
  HeroSection,
  SearchBox,
  CategoryFilter,
  ModelTagFilter,
  TagFilter,
  PromptGrid,
  Sidebar,
} from './components/home';
import LanguageSwitcher from './components/LanguageSwitcher';
import { Footer } from './components/Footer';

// Hooks
import { useSearch } from '@/hooks/useSearch';
import { usePagination } from '@/hooks/usePagination';
import { useAuth } from '@/hooks/useAuth';
import { usePromptsQuery, useTagsQuery, useCategoriesQuery, useModelTagsQuery } from '@/hooks/queries';

// Types and config
import { PromptItem } from '@/types';
import { ADMIN_CONFIG } from '@/lib/constants';

interface HomeClientProps {
  initialPrompts: PromptItem[];
}

export default function HomeClient({ initialPrompts }: HomeClientProps) {
  const t = useTranslations('header');

  // Use React Query with initial data from server
  const { data: prompts = initialPrompts, isLoading: promptsLoading } = usePromptsQuery(initialPrompts);
  const { data: serverTags = [] } = useTagsQuery();
  const { data: serverCategories = [] } = useCategoriesQuery();
  const { data: serverModelTags = [] } = useModelTagsQuery();
  
  const loading = promptsLoading;
  const router = useRouter();

  // Authentication state
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();

  // Check if admin entry should be shown based on domain and config
  const [currentDomain, setCurrentDomain] = useState<string>('');

  useEffect(() => {
    // Get current domain on client side
    setCurrentDomain(window.location.hostname.toLowerCase());
  }, []);

  // Determine if admin entry should be visible
  const showAdminEntry = useMemo(() => {
    // If admin entry is disabled globally, hide it
    if (!ADMIN_CONFIG.SHOW_ADMIN_ENTRY) {
      return false;
    }

    // If no allowed domains configured, show for all domains
    if (ADMIN_CONFIG.ALLOWED_DOMAINS.length === 0) {
      return true;
    }

    // Check if current domain is in allowed list
    if (!currentDomain) return true; // Default to show during SSR/initial load

    return ADMIN_CONFIG.ALLOWED_DOMAINS.some(
      (domain) =>
        currentDomain === domain ||
        currentDomain.endsWith(`.${domain}`) ||
        (domain.includes('vercel.app') && currentDomain.includes('vercel.app'))
    );
  }, [currentDomain]);

  // Search and filter with server-provided options where available
  const {
    searchTerm,
    setSearchTerm,
    selectedTag,
    setSelectedTag,
    selectedCategory,
    setSelectedCategory,
    selectedModelTag,
    setSelectedModelTag,
    allTags: derivedTags,
    allCategories: derivedCategories,
    allModelTags: derivedModelTags,
    filteredPrompts,
  } = useSearch(prompts);

  // Prefer server data for filter options, fallback to derived from prompts
  const allTags = serverTags.length > 0 ? serverTags : derivedTags;
  const allCategories = serverCategories.length > 0 ? serverCategories : derivedCategories;
  const allModelTags = serverModelTags.length > 0 ? serverModelTags : derivedModelTags;

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.refresh();
  };

  // Pagination with configurable page size
  const pagination = usePagination(filteredPrompts);

  // Reset to first page when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    pagination.resetPagination();
  };

  const handleTagChange = (tag: string) => {
    setSelectedTag(tag);
    pagination.resetPagination();
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    pagination.resetPagination();
  };

  const handleModelTagChange = (modelTag: string) => {
    setSelectedModelTag(modelTag);
    pagination.resetPagination();
  };

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                <span className="gradient-text">{t('title')}</span>
              </h1>
              <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Auth buttons - only show if admin entry is enabled for this domain */}
            {showAdminEntry && (
              <>
                {authLoading ? (
                  <div className="w-8 h-8 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg transition-all duration-300 font-medium text-sm backdrop-blur-md group"
                    >
                      <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                      <span>{t('admin')}</span>
                    </Link>
                    {isAuthenticated && (
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-destructive/10 border border-border hover:border-destructive/30 text-muted-foreground hover:text-destructive rounded-lg transition-all duration-300 font-medium text-sm backdrop-blur-md"
                        title={t('logout')}
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container pb-16">
        {/* Hero Section */}
        <HeroSection />

        {/* Search */}
        <div className="mb-8">
          <SearchBox value={searchTerm} onChange={handleSearchChange} />
        </div>

        {/* 移动端筛选器 - 仅在 lg 以下显示 */}
        <div className="lg:hidden mb-8 space-y-4">
          <CategoryFilter
            categories={allCategories}
            selected={selectedCategory}
            onSelect={handleCategoryChange}
          />
          <ModelTagFilter
            modelTags={allModelTags}
            selected={selectedModelTag}
            onSelect={handleModelTagChange}
          />
        </div>

        {/* 主内容区：左侧导航 + 右侧卡片 */}
        <div className="flex gap-8">
          {/* 左侧导航栏 - 仅桌面端显示 */}
          <Sidebar
            categories={allCategories}
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategoryChange}
            modelTags={allModelTags}
            selectedModelTag={selectedModelTag}
            onModelTagSelect={handleModelTagChange}
          />

          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0">
            {/* 场景标签筛选 */}
            <div className="mb-8">
              <TagFilter tags={allTags} selected={selectedTag} onSelect={handleTagChange} />
            </div>

            {/* Prompts Grid */}
            <PromptGrid loading={loading} filteredPrompts={filteredPrompts} pagination={pagination} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}
