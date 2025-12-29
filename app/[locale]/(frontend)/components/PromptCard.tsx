'use client';

import { PromptItem } from '@/types';
import { Tag, Calendar, ExternalLink, Copy, Check, Zap, FolderOpen, Cpu, ThumbsUp, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import OptimizedImage from './OptimizedImage';
import ImagePreview from './ImagePreview';
import { useInteractPromptMutation } from '@/hooks/queries/usePromptsQuery';
import { useTranslations, useLocale } from 'next-intl';

// AI模型标签颜色映射 - 使用新的配色方案
const MODEL_TAG_COLORS: Record<string, string> = {
  'Midjourney': 'hsl(43, 96%, 56%)', // Gold
  'DALL-E 3': 'hsl(217, 91%, 60%)', // Blue
  'Stable Diffusion': 'hsl(280, 100%, 70%)', // Purple
  'Flux': 'hsl(0, 84%, 60%)', // Red
  'Leonardo.AI': 'hsl(28, 100%, 50%)', // Orange
  'ComfyUI': 'hsl(140, 60%, 50%)', // Green
  'Runway': 'hsl(200, 80%, 55%)', // Cyan
  'Sora': 'hsl(260, 70%, 60%)', // Purple-Blue
  'Pika': 'hsl(310, 80%, 60%)', // Pink
  'Kling': 'hsl(25, 85%, 55%)', // Coral
  'Suno': 'hsl(45, 90%, 55%)', // Yellow
  'Udio': 'hsl(180, 60%, 50%)', // Teal
  'DeepSeek': 'hsl(220, 90%, 60%)', // Deep Blue
  'Banana': 'hsl(50, 95%, 55%)', // Banana Yellow
  '其他模型': 'hsl(0, 0%, 60%)', // Gray
};

interface PromptCardProps {
  prompt: PromptItem;
  index?: number;
  /** 是否优先加载图片（首屏图片应设为 true） */
  priority?: boolean;
}

export default function PromptCard({ prompt, index = 0, priority = false }: PromptCardProps) {
  const t = useTranslations('card');
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);
  const interactMutation = useInteractPromptMutation();

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopied(true);
      // 增加爱心数 (复制次数)
      interactMutation.mutate({ id: prompt.id, type: 'heart' });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    interactMutation.mutate({ id: prompt.id, type: 'like' });
  };

  const handleHeart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    interactMutation.mutate({ id: prompt.id, type: 'heart' });
  };

  const handleImageMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!prompt.imageUrl || imageError) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setIsHovering(true);
  };

  const handleImageMouseLeave = () => {
    setIsHovering(false);
  };

  // 监听滚动事件，滚动时取消放大显示
  useEffect(() => {
    if (!isHovering) return;

    const handleScroll = () => {
      setIsHovering(false);
    };

    // 监听 window 滚动和所有可能的滚动容器
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isHovering]);

  // 监听鼠标移动，检测是否离开了图片区域
  const handleMouseMoveCheck = useCallback(() => {
    if (!isHovering || !imageRef.current) return;
    
    // 使用 requestAnimationFrame 来优化性能
    requestAnimationFrame(() => {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const mouseX = (window as typeof window & { _lastMouseX?: number })._lastMouseX ?? 0;
      const mouseY = (window as typeof window & { _lastMouseY?: number })._lastMouseY ?? 0;
      
      // 检查鼠标是否在图片区域内
      if (
        mouseX < rect.left ||
        mouseX > rect.right ||
        mouseY < rect.top ||
        mouseY > rect.bottom
      ) {
        setIsHovering(false);
      }
    });
  }, [isHovering]);

  // 全局鼠标位置跟踪
  useEffect(() => {
    if (!isHovering) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      (window as typeof window & { _lastMouseX?: number })._lastMouseX = e.clientX;
      (window as typeof window & { _lastMouseY?: number })._lastMouseY = e.clientY;
      handleMouseMoveCheck();
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isHovering, handleMouseMoveCheck]);

  const handleImageClick = (e: React.MouseEvent) => {
    if (!prompt.imageUrl || imageError) return;
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const getModelColor = (modelName: string) => {
    return MODEL_TAG_COLORS[modelName] || 'hsl(0, 0%, 60%)';
  };

  // Format date based on locale
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString || isNaN(new Date(dateString).getTime())) {
      return t('noDate');
    }
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <article 
      className="glass-card glass-card-hover glow-effect group overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
    >
      {/* Image */}
      <div 
        ref={imageRef}
        className="relative aspect-[4/3] overflow-hidden cursor-pointer"
        onMouseEnter={handleImageMouseEnter}
        onMouseLeave={handleImageMouseLeave}
        onClick={handleImageClick}
      >
        {prompt.imageUrl && !imageError ? (
          <>
            <OptimizedImage
              src={prompt.imageUrl}
              alt={prompt.effect}
              fill
              priority={priority}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            
            {/* Category Badge */}
            <div className="absolute left-3 top-3">
              {prompt.category && (
                <span className="inline-flex items-center rounded-full bg-background/80 backdrop-blur-sm px-2.5 py-1 text-xs font-medium">
                  {prompt.category}
                </span>
              )}
            </div>

            {/* Model Tags */}
            <div className="absolute right-3 top-3 flex flex-wrap gap-1.5 justify-end max-w-[60%]">
              {(prompt.modelTags || []).slice(0, 2).map((modelTag) => {
                const color = getModelColor(modelTag);
                return (
                  <span
                    key={modelTag}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm"
                    style={{ 
                      backgroundColor: `${color}20`,
                      color: color,
                    }}
                  >
                    <span 
                      className="h-1.5 w-1.5 rounded-full" 
                      style={{ backgroundColor: color }}
                    />
                    {modelTag}
                  </span>
                );
              })}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Zap className="w-10 h-10 text-muted-foreground opacity-20" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="mb-2 text-lg font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {prompt.effect}
        </h3>

        {/* Description */}
        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
          {prompt.description}
        </p>

        {/* Tags and Source */}
        {((prompt.tags || []).filter(tag => tag).length > 0 || (prompt.source && prompt.source !== 'unknown')) && (
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(prompt.tags || []).filter(tag => tag).slice(0, 3).map((tag, idx) => (
                <span key={tag || idx} className="tag-badge text-xs">
                  {tag}
                </span>
              ))}
              {(prompt.tags || []).filter(tag => tag).length > 3 && (
                <span className="tag-badge text-xs">+{(prompt.tags || []).filter(tag => tag).length - 3}</span>
              )}
            </div>

            {prompt.source && prompt.source !== 'unknown' && (
              <a
                href={prompt.source}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 pt-0.5"
                title={prompt.source}
              >
                {t('source')}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {/* Prompt Content */}
        <div className="mb-4 rounded-lg bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-2">
            <code className={`flex-1 text-xs font-mono text-muted-foreground ${expanded ? '' : 'line-clamp-2'}`}>
              {prompt.prompt}
            </code>
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(prompt.updatedAt)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              title={t('like')}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              <span>{prompt.likes || 0}</span>
            </button>
            <button
              onClick={copyPrompt}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                copied 
                  ? 'bg-primary/20 text-primary border border-primary/30' 
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {t('copied')}
                </>
              ) : (
                <>
                  <Heart className="h-3.5 w-3.5" />
                  <span>{prompt.hearts || 0}</span>
                  <Copy className="h-3.5 w-3.5" />
                  {t('copy')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Preview Component */}
      {prompt.imageUrl && !imageError && (
        <ImagePreview
          src={prompt.imageUrl}
          alt={prompt.effect}
          isHovering={isHovering}
          isModalOpen={isModalOpen}
          onCloseModal={handleCloseModal}
          hoverPosition={hoverPosition}
        />
      )}
    </article>
  );
}