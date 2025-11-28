import { PromptItem } from '@/types';
import { Tag, Calendar, ExternalLink, Copy, Check, Zap } from 'lucide-react';
import { useState } from 'react';

interface PromptCardProps {
  prompt: PromptItem;
}

export default function PromptCard({ prompt }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getImageUrl = (url: string | undefined) => {
    if (!url) return '';
    // 如果是 http 开头，直接返回
    if (url.startsWith('http') || url.startsWith('//')) {
      return url;
    }
    // 如果是本地相对路径 (./data/image/... 或 data/image/...)
    if (url.startsWith('./data/image') || url.startsWith('data/image')) {
      return `/api/local-image?path=${encodeURIComponent(url)}`;
    }
    // 其他情况原样返回
    return url;
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    // 修改 Hover 效果：从 tech-blue 调整为 tech-primary，移除紫色阴影
    <div className="group relative h-full bg-dark-800 rounded-2xl overflow-hidden border border-white/5 hover:border-tech-primary/30 transition-all duration-500 flex flex-col shadow-lg hover:shadow-[0_0_30px_-5px_rgba(56,189,248,0.15)] hover:-translate-y-1">
      {/* Glow Effect - 保持微弱的白色辉光，增加质感 */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Image */}
      <div className="relative aspect-video bg-dark-900 overflow-hidden border-b border-white/5">
        {prompt.imageUrl && !imageError ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getImageUrl(prompt.imageUrl)}
              alt={prompt.effect}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-800 to-transparent opacity-60" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dark-400 bg-dark-900/50">
            <Zap className="w-10 h-10 opacity-20" />
          </div>
        )}
        
        {/* Floating Badge - 调整为黑金/银灰风格 */}
        <div className="absolute top-3 left-3">
          <div className="px-3 py-1 bg-dark-900/90 backdrop-blur-md border border-white/10 rounded-full text-xs font-medium text-gray-200 shadow-lg flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-tech-accent animate-pulse" />
            AI Art
          </div>
        </div>
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
        {(prompt.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {(prompt.tags || []).slice(0, 3).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-1 bg-tech-primary/5 text-tech-primary/90 rounded-md text-xs font-medium border border-tech-primary/20 hover:bg-tech-primary/10 transition-colors"
              >
                <Tag className="w-3 h-3 mr-1.5 opacity-70" />
                {tag}
              </span>
            ))}
            {(prompt.tags || []).length > 3 && (
              <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500 border border-transparent">
                +{(prompt.tags || []).length - 3}
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
              title={copied ? '已复制' : '复制提示词'}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-5 border-t border-white/5 mt-5">
          <div className="flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-70" />
            {prompt.updatedAt && !isNaN(new Date(prompt.updatedAt).getTime()) 
              ? new Date(prompt.updatedAt).toLocaleDateString('zh-CN')
              : '暂无日期'}
          </div>
          {prompt.source && prompt.source !== 'unknown' && (
            <a
              href={prompt.source}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-gray-500 hover:text-tech-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5 opacity-70" />
              来源
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
