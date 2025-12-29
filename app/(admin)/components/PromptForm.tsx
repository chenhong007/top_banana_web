/**
 * PromptForm Component
 * Form for creating and editing prompts
 */

import { useState, useCallback } from 'react';
import { CreatePromptRequest } from '@/types';
import { Save, X, FolderOpen, ImageIcon, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { UI_TEXT, MESSAGES, DEFAULT_CATEGORIES } from '@/lib/constants';
import { INPUT_STYLES, BUTTON_STYLES, CARD_STYLES, LABEL_STYLES } from '@/lib/styles';
import { getImageUrlsArray, createImageFields } from '@/lib/image-utils';
import TagInput from './TagInput';
import ModelTagInput from './ModelTagInput';
import MultiImageUpload from './MultiImageUpload';

/**
 * 检查 URL 是否是 X.com/Twitter 链接
 */
function isXUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    // 检查是否是推文链接（包含 /status/）
    const isTwitterHost = hostname.includes('x.com') || hostname.includes('twitter.com');
    const hasStatusPath = urlObj.pathname.includes('/status/');
    return isTwitterHost && hasStatusPath;
  } catch {
    return false;
  }
}

/**
 * 检查 URL 是否是 R2 存储的图片
 */
function isR2ImageUrl(url: string): boolean {
  if (!url) return false;
  // 检查是否是 API 代理格式或公开 URL
  return url.includes('/api/images/') || url.includes('images.topai.ink/images/');
}

interface PromptFormProps {
  formData: CreatePromptRequest;
  isCreating: boolean;
  submitting: boolean;
  categories: string[];
  onSubmit: () => void;
  onCancel: () => void;
  onChange: (data: CreatePromptRequest) => void;
  onTagsChange: (tags: string[]) => void;
  onModelTagsChange: (modelTags: string[]) => void;
}

interface ExtractXResponse {
  success: boolean;
  error?: string;
  data?: {
    tweetId: string;
    username: string;
    totalFound: number;
    uploaded: number;
    failed: number;
    r2Urls: string[];
    results: Array<{
      originalUrl: string;
      r2Url?: string;
      error?: string;
    }>;
  };
}

// 必填字段配置
interface RequiredField {
  key: keyof CreatePromptRequest;
  label: string;
}

const REQUIRED_FIELDS: RequiredField[] = [
  { key: 'effect', label: '卡片标题' },
  { key: 'source', label: '来源' },
  { key: 'category', label: '生成类型' },
  { key: 'modelTags', label: 'AI 模型标签' },
  { key: 'description', label: '详细描述' },
  { key: 'prompt', label: '提示词内容' },
  { key: 'tags', label: '标签' },
];

export default function PromptForm({
  formData,
  isCreating,
  submitting,
  categories,
  onSubmit,
  onCancel,
  onChange,
  onTagsChange,
  onModelTagsChange,
}: PromptFormProps) {
  // 是否已尝试提交（用于显示验证错误）
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  // X.com 同步状态
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // 检查来源是否是 X.com 链接
  const sourceIsXUrl = isXUrl(formData.source);

  // 同步 X.com 图片 - 提取并上传到 R2，清除非 R2 链接
  const handleSyncXImages = useCallback(async () => {
    if (!sourceIsXUrl || syncing) return;

    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);

    try {
      // 获取现有图片，只保留 R2 图片
      const existingImages = getImageUrlsArray(formData.imageUrl, formData.imageUrls);
      const r2OnlyImages = existingImages.filter(url => isR2ImageUrl(url));
      
      const response = await fetch('/api/extract-x-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.source,
          clearNonR2: true, // 清除非 R2 链接
        }),
      });

      const data: ExtractXResponse = await response.json();

      if (data.success && data.data) {
        const { r2Urls, uploaded, failed, totalFound } = data.data;
        
        if (r2Urls.length > 0) {
          // 合并 R2 图片（保留已有的 R2 图片 + 新上传的）
          const mergedUrls = [...r2OnlyImages, ...r2Urls];
          // 去重并限制最多 6 张
          const uniqueUrls = [...new Set(mergedUrls)].slice(0, 6);
          
          // 更新图片字段
          onChange({
            ...formData,
            ...createImageFields(uniqueUrls),
          });
          
          let message = `从推文提取 ${totalFound} 张图片，成功上传 ${uploaded} 张到 R2`;
          if (failed > 0) {
            message += `，${failed} 张失败`;
          }
          // 如果清除了非 R2 图片
          const clearedCount = existingImages.length - r2OnlyImages.length;
          if (clearedCount > 0) {
            message += `，已清除 ${clearedCount} 张非 R2 链接图片`;
          }
          
          setSyncSuccess(message);
          
          // 5秒后清除成功消息
          setTimeout(() => setSyncSuccess(null), 5000);
        } else {
          setSyncError('上传图片失败，请重试');
        }
      } else {
        setSyncError(data.error || '同步失败，未找到图片');
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : '同步请求失败');
    } finally {
      setSyncing(false);
    }
  }, [sourceIsXUrl, syncing, formData, onChange]);
  
  // 检查单个字段是否有效
  const isFieldValid = (key: keyof CreatePromptRequest): boolean => {
    const value = formData[key];
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return Boolean(value);
  };
  
  // 获取缺失的必填字段
  const getMissingFields = (): string[] => {
    return REQUIRED_FIELDS
      .filter(field => !isFieldValid(field.key))
      .map(field => field.label);
  };
  
  // 表单整体是否有效
  const missingFields = getMissingFields();
  const isValid = missingFields.length === 0;
  
  // 获取输入框的样式（包含错误状态）
  const getInputClassName = (fieldKey: keyof CreatePromptRequest, baseClass: string): string => {
    const hasError = hasAttemptedSubmit && !isFieldValid(fieldKey);
    if (hasError) {
      return `${baseClass} border-red-300 focus:ring-red-500/20 focus:border-red-500`;
    }
    return baseClass;
  };
  
  // 处理提交
  const handleSubmit = () => {
    setHasAttemptedSubmit(true);
    if (isValid) {
      onSubmit();
    }
  };
  
  // Merge default categories with fetched categories
  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]));
  
  return (
    <div className={`${CARD_STYLES.withPadding} mb-8 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 border-l-4 ${isCreating ? 'border-blue-500' : 'border-green-500'}`}>
      <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {isCreating ? '新建提示词' : '编辑提示词'}
          </h2>
          {!isCreating && formData.effect && (
            <p className="text-sm text-gray-500 mt-1">正在编辑: {formData.effect}</p>
          )}
        </div>
        <button 
          onClick={onCancel} 
          className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          title="取消"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Effect Field */}
          <div>
            <label className={LABEL_STYLES.required}>卡片标题</label>
            <input
              type="text"
              value={formData.effect}
              onChange={(e) => onChange({ ...formData, effect: e.target.value })}
              disabled={submitting}
              className={getInputClassName('effect', submitting ? INPUT_STYLES.disabled : INPUT_STYLES.base)}
              placeholder={UI_TEXT.PLACEHOLDER.EFFECT}
            />
            {hasAttemptedSubmit && !isFieldValid('effect') && (
              <p className="text-xs text-red-500 mt-1.5">请填写卡片标题</p>
            )}
          </div>

          {/* Source Field */}
          <div>
            <label className={LABEL_STYLES.required}>来源</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.source}
                onChange={(e) => {
                  onChange({ ...formData, source: e.target.value });
                  // 清除之前的同步状态
                  setSyncError(null);
                  setSyncSuccess(null);
                }}
                disabled={submitting || syncing}
                className={getInputClassName('source', submitting ? INPUT_STYLES.disabled : `${INPUT_STYLES.base} flex-1`)}
                placeholder={UI_TEXT.PLACEHOLDER.SOURCE}
              />
              {sourceIsXUrl && (
                <button
                  type="button"
                  onClick={handleSyncXImages}
                  disabled={submitting || syncing}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 whitespace-nowrap
                    ${syncing 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 hover:border-blue-300'
                    }
                  `}
                  title="从 X.com 提取图片并上传到 R2"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {syncing ? '同步中...' : '同步图片'}
                </button>
              )}
            </div>
            {hasAttemptedSubmit && !isFieldValid('source') && (
              <p className="text-xs text-red-500 mt-1.5">请填写来源</p>
            )}
            {syncError && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {syncError}
              </p>
            )}
            {syncSuccess && (
              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                ✓ {syncSuccess}
              </p>
            )}
            {sourceIsXUrl && !syncing && !syncError && !syncSuccess && (
              <p className="text-xs text-gray-400 mt-1.5">
                检测到 X.com 链接，点击"同步图片"可自动提取推文图片并上传到 R2
              </p>
            )}
          </div>
        </div>

        {/* Category Field */}
        <div>
          <label className={LABEL_STYLES.required}>
            <FolderOpen className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            生成类型
          </label>
          <select
            value={formData.category || ''}
            onChange={(e) => onChange({ ...formData, category: e.target.value })}
            disabled={submitting}
            className={getInputClassName('category', submitting ? INPUT_STYLES.disabled : INPUT_STYLES.base)}
          >
            <option value="">请选择生成类型</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {hasAttemptedSubmit && !isFieldValid('category') && (
            <p className="text-xs text-red-500 mt-1.5">请选择生成类型</p>
          )}
        </div>

        {/* Model Tags Field */}
        <div>
          <ModelTagInput
            selectedTags={formData.modelTags || []}
            onChange={onModelTagsChange}
            disabled={submitting}
            required={true}
            hasError={hasAttemptedSubmit && !isFieldValid('modelTags')}
          />
          <p className="text-xs text-gray-400 mt-1.5">选择该提示词适用的 AI 模型（如 Midjourney、DALL-E 等）</p>
          {hasAttemptedSubmit && !isFieldValid('modelTags') && (
            <p className="text-xs text-red-500 mt-1.5">请至少选择一个 AI 模型</p>
          )}
        </div>

        {/* Description Field */}
        <div>
          <label className={LABEL_STYLES.required}>详细描述</label>
          <textarea
            value={formData.description}
            onChange={(e) => onChange({ ...formData, description: e.target.value })}
            disabled={submitting}
            className={getInputClassName('description', submitting ? `${INPUT_STYLES.disabled} h-24` : `${INPUT_STYLES.textarea} h-24`)}
            placeholder={UI_TEXT.PLACEHOLDER.DESCRIPTION}
          />
          {hasAttemptedSubmit && !isFieldValid('description') && (
            <p className="text-xs text-red-500 mt-1.5">请填写详细描述</p>
          )}
        </div>

        {/* Tags Field */}
        <div>
          <TagInput
            selectedTags={formData.tags}
            onChange={onTagsChange}
            disabled={submitting}
            required={true}
            hasError={hasAttemptedSubmit && !isFieldValid('tags')}
          />
          <p className="text-xs text-gray-400 mt-1.5">选择已有标签或输入新标签名创建</p>
          {hasAttemptedSubmit && !isFieldValid('tags') && (
            <p className="text-xs text-red-500 mt-1.5">请至少选择一个标签</p>
          )}
        </div>

        {/* Prompt Field */}
        <div>
          <label className={LABEL_STYLES.required}>提示词内容</label>
          <div className="relative">
            <textarea
              value={formData.prompt}
              onChange={(e) => onChange({ ...formData, prompt: e.target.value })}
              disabled={submitting}
              className={getInputClassName('prompt', submitting ? `${INPUT_STYLES.disabled} h-40 font-mono text-sm` : `${INPUT_STYLES.base} h-40 font-mono text-sm resize-y`)}
              placeholder={UI_TEXT.PLACEHOLDER.PROMPT}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">
              Markdown supported
            </div>
          </div>
          {hasAttemptedSubmit && !isFieldValid('prompt') && (
            <p className="text-xs text-red-500 mt-1.5">请填写提示词内容</p>
          )}
        </div>

        {/* Multi Image Upload Field */}
        <div>
          <label className={LABEL_STYLES.base}>
            <ImageIcon className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            图片（可选，最多 6 张，第一张为封面）
          </label>
          <MultiImageUpload
            value={getImageUrlsArray(formData.imageUrl, formData.imageUrls)}
            onChange={(urls) => onChange({ 
              ...formData, 
              ...createImageFields(urls)
            })}
            disabled={submitting}
            maxImages={6}
          />
        </div>

        {/* Validation Error Summary */}
        {hasAttemptedSubmit && !isValid && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">请完善以下必填字段：</p>
              <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={submitting}
            className={BUTTON_STYLES.secondary}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={BUTTON_STYLES.primary}
          >
            <Save className="w-4 h-4" />
            {submitting ? MESSAGES.LOADING.SAVE : (isCreating ? '创建' : '保存更改')}
          </button>
        </div>
      </div>
    </div>
  );
}
