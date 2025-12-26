'use client';

/**
 * HomeClient Component
 * Main client component for the home page
 * Refactored to use smaller sub-components and React Query
 */

import { Sparkles, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

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
  // Note: Query hooks already return string arrays
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
      <header className="sticky top-0 z-50 glass border-b border-white/5 shadow-lg shadow-black/20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {/* Logo */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tech-primary to-tech-accent flex items-center justify-center shadow-lg shadow-tech-primary/10">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  全球最热门banana玩法大全
                </h1>
                <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                  top ai prompts
                </p>
              </div>
            </div>
            {/* Auth buttons - only show if admin entry is enabled for this domain */}
            {showAdminEntry && (
              <div className="flex items-center gap-3">
                {authLoading ? (
                  <div className="w-8 h-8 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-gray-500/30 border-t-gray-400 rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-5 py-2.5 bg-tech-primary/10 hover:bg-tech-primary/20 border border-tech-primary/30 text-tech-primary rounded-lg transition-all duration-300 font-medium text-sm backdrop-blur-md group"
                    >
                      <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                      <span>管理后台</span>
                    </Link>
                    {isAuthenticated && (
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-lg transition-all duration-300 font-medium text-sm backdrop-blur-md"
                        title="退出登录"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <HeroSection />

        {/* Search - 全宽与卡片对齐 */}
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
    </>
  );
}
