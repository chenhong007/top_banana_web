import { PromptItem } from '@/types';
import { Tag, Calendar, ExternalLink, Copy, Check, Zap, FolderOpen, Cpu } from 'lucide-react';
import { useState } from 'react';
import OptimizedImage from './OptimizedImage';

// AI模型标签颜色映射
const MODEL_TAG_COLORS: Record<string, string> = {
  'Midjourney': '#5865F2',
  'DALL-E 3': '#10A37F',
  'Stable Diffusion': '#A855F7',
  'Flux': '#EC4899',
  'Leonardo.AI': '#F97316',
  'ComfyUI': '#22C55E',
  'Runway': '#3B82F6',
  'Sora': '#000000',
  'Pika': '#8B5CF6',
  'Kling': '#FF6B35',
  'Suno': '#FACC15',
  'Udio': '#06B6D4',
  'DeepSeek': '#2563EB',
  'Banana': '#FBBF24',
  '其他模型': '#6B7280',
};

interface PromptCardProps {
  prompt: PromptItem;
}

export default function PromptCard({ prompt }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

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
        
        {/* AI Model Tags - 左上角显示 AI 模型 */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[70%]">
          {(prompt.modelTags || []).slice(0, 2).map(modelTag => {
            const color = MODEL_TAG_COLORS[modelTag] || '#6B7280';
            return (
              <div
                key={modelTag}
                className="px-2.5 py-1 backdrop-blur-md border rounded-full text-xs font-medium text-white shadow-lg flex items-center gap-1"
                style={{ 
                  backgroundColor: `${color}E6`,
                  borderColor: `${color}50`
                }}
              >
                <Cpu className="w-3 h-3" />
                {modelTag}
              </div>
            );
          })}
          {(prompt.modelTags || []).length > 2 && (
            <div className="px-2 py-1 bg-dark-900/90 backdrop-blur-md border border-white/10 rounded-full text-xs font-medium text-gray-300">
              +{(prompt.modelTags || []).length - 2}
            </div>
          )}
          {(!prompt.modelTags || prompt.modelTags.length === 0) && (
            <div className="px-3 py-1 bg-dark-900/90 backdrop-blur-md border border-white/10 rounded-full text-xs font-medium text-gray-200 shadow-lg flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-tech-accent animate-pulse" />
              AI Art
            </div>
          )}
        </div>
        
        {/* Category Badge - 右上角显示生成类型 */}
        {prompt.category && (
          <div className="absolute top-3 right-3">
            <div className="px-3 py-1 bg-amber-500/90 backdrop-blur-md border border-amber-400/30 rounded-full text-xs font-medium text-white shadow-lg flex items-center gap-1.5">
              <FolderOpen className="w-3 h-3" />
              {prompt.category}
            </div>
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
