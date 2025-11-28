'use client';

import { Search, FileQuestion, Sparkles, LogIn, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import PromptCard from './components/PromptCard';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from './components/Pagination';
import { useSearch } from '@/hooks/useSearch';
import { usePagination } from '@/hooks/usePagination';
import { useAuth } from '@/hooks/useAuth';
import { PromptItem } from '@/types';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface HomeClientProps {
  initialPrompts: PromptItem[];
}

export default function HomeClient({ initialPrompts }: HomeClientProps) {
  const [prompts] = useState<PromptItem[]>(initialPrompts);
  const loading = false;
  const router = useRouter();
  
  // Authentication state
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  
  // Search and filter
  const { 
    searchTerm, 
    setSearchTerm, 
    selectedTag, 
    setSelectedTag, 
    allTags, 
    filteredPrompts 
  } = useSearch(prompts);
  
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

  return (
    <div className="min-h-screen bg-dark-900 text-white bg-tech-grid bg-fixed">
      {/* Background Decoration - 移除紫色，改用深邃的黑蓝光晕 */}
      <div className="fixed inset-0 bg-subtle-gradient pointer-events-none z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-tech-primary/5 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse-slow" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-tech-accent/5 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse-slow" style={{ animationDelay: '3s' }} />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {/* Logo 调整为黑金/冷蓝风格 */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tech-primary to-tech-accent flex items-center justify-center shadow-lg shadow-tech-primary/10">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  全球最热门banana玩法大全
                </h1>
                <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">top ai prompts</p>
              </div>
            </div>
            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              {authLoading ? (
                <div className="w-8 h-8 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-500/30 border-t-gray-400 rounded-full animate-spin" />
                </div>
              ) : isAuthenticated ? (
                <>
                  <Link 
                    href="/admin"
                    className="flex items-center gap-2 px-5 py-2.5 bg-tech-primary/10 hover:bg-tech-primary/20 border border-tech-primary/30 text-tech-primary rounded-lg transition-all duration-300 font-medium text-sm backdrop-blur-md group"
                  >
                    <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                    <span>管理后台</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-lg transition-all duration-300 font-medium text-sm backdrop-blur-md"
                    title="退出登录"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <Link 
                  href="/login"
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-tech-primary/10 border border-white/10 hover:border-tech-primary/30 text-gray-300 hover:text-tech-primary rounded-lg transition-all duration-300 font-medium text-sm backdrop-blur-md group"
                >
                  <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                  <span>登录管理</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-white animate-float tracking-tight drop-shadow-xl">
            探索无限创意
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto font-light">
            精选优质 AI 提示词，激发你的创作灵感
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-12 space-y-6">
          <div className="relative max-w-2xl mx-auto group">
            {/* 搜索框光晕改为冷色调 */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-primary/50 to-tech-accent/50 rounded-2xl opacity-20 group-hover:opacity-50 transition duration-500 blur-lg"></div>
            <div className="relative flex items-center bg-dark-900/80 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl group-hover:border-white/20 transition-all duration-300">
              <Search className="absolute left-4 text-gray-500 w-5 h-5 group-focus-within:text-tech-primary transition-colors" />
              <input
                type="text"
                placeholder="搜索提示词、效果或描述..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-gray-500 rounded-xl focus:outline-none text-lg"
              />
            </div>
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => handleTagChange('')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
                  !selectedTag
                    ? 'bg-tech-primary/10 border-tech-primary/50 text-tech-primary shadow-[0_0_15px_-3px_rgba(56,189,248,0.2)]'
                    : 'bg-dark-800/50 border-white/5 text-gray-400 hover:border-white/20 hover:text-white hover:bg-white/5'
                }`}
              >
                全部
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagChange(tag)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
                    selectedTag === tag
                      ? 'bg-tech-primary/10 border-tech-primary/50 text-tech-primary shadow-[0_0_15px_-3px_rgba(56,189,248,0.2)]'
                      : 'bg-dark-800/50 border-white/5 text-gray-400 hover:border-white/20 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPrompts.length === 0 && (
          <div className="text-center py-20">
            <EmptyState
              icon={<FileQuestion className="w-20 h-20 text-gray-600" />}
              title="暂无提示词数据"
              description="尝试其他搜索词或前往管理后台添加"
            />
          </div>
        )}

        {/* Prompts Grid */}
        {!loading && pagination.paginatedItems.length > 0 && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pagination.paginatedItems.map((prompt, index) => (
                <div 
                  key={prompt.id} 
                  className="animate-float" 
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <PromptCard prompt={prompt} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center pt-8 border-t border-white/5">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                pageSize={pagination.pageSize}
                onPageChange={pagination.goToPage}
                onPageSizeChange={pagination.changePageSize}
                hasNextPage={pagination.hasNextPage}
                hasPreviousPage={pagination.hasPreviousPage}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

