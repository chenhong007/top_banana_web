'use client';

import { PromptItem } from '@/types';
import { Tag, Calendar, ExternalLink, Copy, Check, Zap, FolderOpen, Cpu, ThumbsUp, Heart } from 'lucide-react';
import { useState } from 'react';
import OptimizedImage from './OptimizedImage';
import { useInteractPromptMutation } from '@/hooks/queries/usePromptsQuery';
import { useTranslations, useLocale } from 'next-intl';

// AI模型标签颜色映射 - 使用更暗淡的颜色
const MODEL_TAG_COLORS: Record<string, string> = {
  'Midjourney': '#4752C4',
  'DALL-E 3': '#0D8A6A',
  'Stable Diffusion': '#8B44DB',
  'Flux': '#C93A7A',
  'Leonardo.AI': '#D4610F',
  'ComfyUI': '#1A9A4A',
  'Runway': '#2D6BC4',
  'Sora': '#3D3D3D',
  'Pika': '#7249C9',
  'Kling': '#D45A2D',
  'Suno': '#D4AF0F',
  'Udio': '#059AAD',
  'DeepSeek': '#1E4FC4',
  'Banana': '#D49F1F',
  '其他模型': '#52565E',
};

interface PromptCardProps {
  prompt: PromptItem;
}

export default function PromptCard({ prompt }: PromptCardProps) {
  const t = useTranslations('card');
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
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

  // Format date based on locale
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString || isNaN(new Date(dateString).getTime())) {
      return t('noDate');
    }
    return new Date(dateString).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US');
  };

  return (
    // 修改 Hover 效果：从 tech-blue 调整为 tech-primary，移除紫色阴影
    <div className="group relative h-full bg-dark-800 rounded-2xl overflow-hidden border border-white/5 hover:border-tech-primary/30 transition-all duration-500 flex flex-col shadow-lg hover:shadow-[0_0_30px_-5px_rgba(56,189,248,0.15)] hover:-translate-y-1">
      {/* Glow Effect - 保持微弱的白色辉光，增加质感 */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Image - 使用优化的图片组件 */}
      <div className="relative aspect-video bg-dark-900 overflow-hidden border-b border-white/5">
        {prompt.imageUrl && !imageError ? (
          <>
            <OptimizedImage
              src={prompt.imageUrl}
              alt={prompt.effect}
              fill
              className="w-full h-full transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-800 to-transparent opacity-60 pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dark-400 bg-dark-900/50">
            <Zap className="w-10 h-10 opacity-20" />
          </div>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col relative z-10">
        {/* Effect Title - Hover 颜色调整为 Tech Primary (Sky Blue) */}
        <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-tech-primary transition-colors">
          {prompt.effect}
        </h3>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
          {prompt.description}
        </p>

        {/* Tags - 颜色调整为更冷淡的青色/天蓝 */}
        {(prompt.tags || []).filter(tag => tag).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {(prompt.tags || []).filter(tag => tag).slice(0, 3).map((tag, idx) => (
              <span
                key={tag || idx}
                className="inline-flex items-center px-2.5 py-1 bg-tech-primary/5 text-tech-primary/90 rounded-md text-xs font-medium border border-tech-primary/20 hover:bg-tech-primary/10 transition-colors"
              >
                <Tag className="w-3 h-3 mr-1.5 opacity-70" />
                {tag}
              </span>
            ))}
            {(prompt.tags || []).filter(tag => tag).length > 3 && (
              <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500 border border-transparent">
                +{(prompt.tags || []).filter(tag => tag).length - 3}
              </span>
            )}
          </div>
        )}

        {/* Prompt Box - 移除紫色渐变，改为青色/冷白微光 */}
        <div className="relative mt-auto group/code">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-primary/20 to-tech-accent/20 rounded-lg opacity-0 group-hover/code:opacity-100 transition duration-500 blur-sm" />
          <div className="relative bg-dark-900/80 rounded-lg p-4 border border-white/5 group-hover/code:border-white/10 transition-colors">
            <p className="text-xs text-gray-300 font-mono line-clamp-3 pr-8 break-all leading-relaxed opacity-80 group-hover/code:opacity-100">
              {prompt.prompt}
            </p>
            <button
              onClick={copyPrompt}
              className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-md transition-all duration-200 backdrop-blur-sm opacity-0 group-hover/code:opacity-100"
              title={copied ? t('copied') : t('copy')}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* AI Model & Category Tags - 移到提示词下方，暗淡风格 */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {/* AI Model Tags */}
          {(prompt.modelTags || []).slice(0, 2).map(modelTag => {
            const color = MODEL_TAG_COLORS[modelTag] || '#52565E';
            return (
              <div
                key={modelTag}
                className="px-2 py-0.5 border rounded-md text-xs font-medium text-gray-300 flex items-center gap-1"
                style={{ 
                  backgroundColor: `${color}20`,
                  borderColor: `${color}40`
                }}
              >
                <Cpu className="w-3 h-3 opacity-60" />
                {modelTag}
              </div>
            );
          })}
          {(prompt.modelTags || []).length > 2 && (
            <div className="px-2 py-0.5 bg-dark-700/50 border border-white/5 rounded-md text-xs font-medium text-gray-400">
              +{(prompt.modelTags || []).length - 2}
            </div>
          )}
          {(!prompt.modelTags || prompt.modelTags.length === 0) && (
            <div className="px-2 py-0.5 bg-dark-700/50 border border-white/5 rounded-md text-xs font-medium text-gray-400 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              {t('aiArt')}
            </div>
          )}
          
          {/* Category Badge */}
          {prompt.category && (
            <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs font-medium text-amber-400/70 flex items-center gap-1">
              <FolderOpen className="w-3 h-3 opacity-60" />
              {prompt.category}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-4 pt-5 border-t border-white/5 mt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className="flex items-center gap-1.5 text-gray-400 hover:text-tech-primary transition-colors group/btn"
                title={t('like')}
              >
                <ThumbsUp className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                <span className="text-xs font-medium">{prompt.likes || 0}</span>
              </button>
              <button
                onClick={handleHeart}
                className="flex items-center gap-1.5 text-gray-400 hover:text-rose-500 transition-colors group/btn"
                title={t('heart')}
              >
                <Heart className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                <span className="text-xs font-medium">{prompt.hearts || 0}</span>
              </button>
            </div>
            
            <div className="flex items-center text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-70" />
              {formatDate(prompt.updatedAt)}
            </div>
          </div>

          {prompt.source && prompt.source !== 'unknown' && (
            <div className="flex justify-end">
              <a
                href={prompt.source}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-xs text-gray-500 hover:text-tech-primary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                {t('source')}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
