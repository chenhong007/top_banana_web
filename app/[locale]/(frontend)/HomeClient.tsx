'use client';

/**
 * HomeClient Component
 * Main client component for the home page
 * Refactored to use smaller sub-components and React Query
 * Enhanced with modern glass effects and animations
 */

import { Sparkles, Settings, LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useInView } from 'react-intersection-observer';

// Sub-components
import {
  HeroSection,
  SearchBox,
  CategoryFilter,
  ModelTagFilter,
  TagFilter,
  PromptGrid,
  Sidebar,
  SeoContent,
} from './components/home';
import ImagePreview from './components/ImagePreview';
import LanguageSwitcher from './components/LanguageSwitcher';
import { Footer } from './components/Footer';

// Hooks
import { useDebounce } from '@/hooks/useDebounce';
import { usePagination } from '@/hooks/usePagination';
import { useAuth } from '@/hooks/useAuth';
import { usePromptsInfiniteQuery, useTagsQuery, useCategoriesQuery, useModelTagsQuery } from '@/hooks/queries';

// Types and config
import { PromptItem } from '@/types';
import { ADMIN_CONFIG } from '@/lib/constants';
import { PaginatedResponse } from '@/services/prompt.service';

interface HomeClientProps {
  initialPrompts: PromptItem[];
  initialPagination?: PaginatedResponse<PromptItem>;
}

export default function HomeClient({ initialPrompts, initialPagination }: HomeClientProps) {
  const t = useTranslations('header');
  const locale = useLocale();
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

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedModelTag, setSelectedModelTag] = useState<string>('');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const isSearching = searchTerm !== debouncedSearchTerm;

  const filters = useMemo(() => ({
    search: debouncedSearchTerm,
    category: selectedCategory,
    tag: selectedTag,
    modelTag: selectedModelTag
  }), [debouncedSearchTerm, selectedCategory, selectedTag, selectedModelTag]);

  // Use React Query Infinite Query with filters
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: promptsLoading 
  } = usePromptsInfiniteQuery(initialPagination, filters);
  
  // Flatten prompts from all pages
  const prompts = useMemo(() => {
    return data?.pages.flatMap(page => page.data) || initialPrompts;
  }, [data, initialPrompts]);

  // 获取数据库真实总量（从第一页的分页信息中获取）
  const databaseTotal = useMemo(() => {
    const firstPage = data?.pages[0];
    if (firstPage?.pagination?.total) {
      return firstPage.pagination.total;
    }
    return initialPagination?.pagination?.total;
  }, [data, initialPagination]);

  const loading = promptsLoading && !data;

  // Infinite scroll trigger
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // Server data for filter options
  const { data: serverTags = [] } = useTagsQuery();
  const { data: serverCategories = [] } = useCategoriesQuery();
  const { data: serverModelTags = [] } = useModelTagsQuery();

  // Derived tags/categories from current prompts (fallback)
  const derivedTags = useMemo(() => {
    if (!prompts) return [];
    const set = new Set<string>();
    prompts.forEach(p => p.tags?.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [prompts]);

  const derivedCategories = useMemo(() => {
    if (!prompts) return [];
    const set = new Set<string>();
    prompts.forEach(p => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [prompts]);

  const derivedModelTags = useMemo(() => {
    if (!prompts) return [];
    const set = new Set<string>();
    prompts.forEach(p => p.modelTags?.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [prompts]);

  // With server-side filtering, prompts are already filtered
  const filteredPrompts = prompts;

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
  // Note: We use usePagination hook to handle pagination of the *filtered* list on the client side.
  // The "Infinite Scroll" fetches data from server, adding to the pool.
  // The client-side pagination here splits the *currently loaded* filtered pool into pages for display.
  // Ideally, if we have infinite scroll, we shouldn't have pages numbers, but just a long list.
  // However, the design uses PromptGrid which might use pagination.
  // Let's keep the existing client-side pagination for now as it's part of the UI, 
  // but usually infinite scroll replaces numbered pagination.
  // If the user wants "remainder loaded by client scrolling", they typically want infinite scroll behavior.
  // If we keep usePagination, it will paginate the currently loaded items.
  const pagination = usePagination(filteredPrompts);

  // 获取数据库真实总页数（基于数据库总量和当前页面大小计算）
  const databaseTotalPages = useMemo(() => {
    const firstPage = data?.pages[0];
    const total = firstPage?.pagination?.total ?? initialPagination?.pagination?.total;
    if (total && pagination.pageSize) {
      return Math.ceil(total / pagination.pageSize);
    }
    return initialPagination?.pagination?.totalPages;
  }, [data, initialPagination, pagination.pageSize]);

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

  // Image Preview State
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
    isOpen: boolean;
  } | null>(null);

  const handleImagePreview = (src: string, alt: string) => {
    setPreviewImage({ src, alt, isOpen: true });
  };

  const handleClosePreview = () => {
    setPreviewImage(prev => prev ? { ...prev, isOpen: false } : null);
    // Delay clearing the state to allow animation to finish if needed, or just keep it null
    setTimeout(() => setPreviewImage(null), 300);
  };

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo - 链接到首页，增强内链 */}
          <Link href={`/${locale}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight">
                <span className="gradient-text">{t('title')}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
            </div>
          </Link>
          
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
            {/* 场景标签筛选 - Sticky Header */}
            <div className="sticky top-16 z-40 mb-8 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
              <TagFilter tags={allTags} selected={selectedTag} onSelect={handleTagChange} />
            </div>

            {/* Prompts Grid */}
            <PromptGrid 
              loading={loading} 
              filteredPrompts={filteredPrompts} 
              pagination={pagination} 
              onPreview={handleImagePreview}
              databaseTotal={databaseTotal}
              databaseTotalPages={databaseTotalPages}
              isSearching={isSearching}
              enableInfiniteScroll={true}
            />
            
            {/* Infinite Scroll Loader */}
            {hasNextPage && (
              <div ref={ref} className="flex justify-center py-8">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                     <Loader2 className="h-6 w-6 animate-spin" />
                     <span>Loading more...</span>
                  </div>
                ) : (
                  <div className="h-4" /> // Spacer for intersection observer
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Global Image Preview */}
      {previewImage && (
        <ImagePreview
          src={previewImage.src}
          alt={previewImage.alt}
          isModalOpen={previewImage.isOpen}
          onCloseModal={handleClosePreview}
          // We removed hover preview logic for global state simplicity and performance
          isHovering={false}
        />
      )}

      {/* SEO Content Section */}
      <SeoContent />

      {/* Footer */}
      <Footer />
    </>
  );
}
