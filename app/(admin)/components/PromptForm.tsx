/**
 * PromptForm Component
 * Form for creating and editing prompts
 */

import { CreatePromptRequest } from '@/types';
import { Save, X, FolderOpen } from 'lucide-react';
import { UI_TEXT, MESSAGES, DEFAULT_CATEGORIES } from '@/lib/constants';
import { INPUT_STYLES, BUTTON_STYLES, CARD_STYLES, LABEL_STYLES } from '@/lib/styles';
import TagInput from './TagInput';
import ModelTagInput from './ModelTagInput';

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
  // Validate form
  const isValid = formData.effect && formData.description && formData.prompt && formData.source;
  
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
              className={submitting ? INPUT_STYLES.disabled : INPUT_STYLES.base}
              placeholder={UI_TEXT.PLACEHOLDER.EFFECT}
            />
          </div>

          {/* Source Field */}
          <div>
            <label className={LABEL_STYLES.required}>来源</label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => onChange({ ...formData, source: e.target.value })}
              disabled={submitting}
              className={submitting ? INPUT_STYLES.disabled : INPUT_STYLES.base}
              placeholder={UI_TEXT.PLACEHOLDER.SOURCE}
            />
          </div>
        </div>

        {/* Category Field */}
        <div>
          <label className={LABEL_STYLES.base}>
            <FolderOpen className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            生成类型（可选）
          </label>
          <select
            value={formData.category || ''}
            onChange={(e) => onChange({ ...formData, category: e.target.value })}
            disabled={submitting}
            className={submitting ? INPUT_STYLES.disabled : INPUT_STYLES.base}
          >
            <option value="">选择生成类型（默认：文生图）</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1.5">不选择将默认使用"文生图"类别</p>
        </div>

        {/* Model Tags Field */}
        <div>
          <ModelTagInput
            selectedTags={formData.modelTags || []}
            onChange={onModelTagsChange}
            disabled={submitting}
          />
          <p className="text-xs text-gray-400 mt-1.5">选择该提示词适用的 AI 模型（如 Midjourney、DALL-E 等）</p>
        </div>

        {/* Description Field */}
        <div>
          <label className={LABEL_STYLES.required}>详细描述</label>
          <textarea
            value={formData.description}
            onChange={(e) => onChange({ ...formData, description: e.target.value })}
            disabled={submitting}
            className={submitting ? `${INPUT_STYLES.disabled} h-24` : `${INPUT_STYLES.textarea} h-24`}
            placeholder={UI_TEXT.PLACEHOLDER.DESCRIPTION}
          />
        </div>

        {/* Tags Field */}
        <div>
          <TagInput
            selectedTags={formData.tags}
            onChange={onTagsChange}
            disabled={submitting}
          />
          <p className="text-xs text-gray-400 mt-1.5">选择已有标签或输入新标签名创建</p>
        </div>

        {/* Prompt Field */}
        <div>
          <label className={LABEL_STYLES.required}>提示词内容</label>
          <div className="relative">
            <textarea
              value={formData.prompt}
              onChange={(e) => onChange({ ...formData, prompt: e.target.value })}
              disabled={submitting}
              className={submitting ? `${INPUT_STYLES.disabled} h-40 font-mono text-sm` : `${INPUT_STYLES.base} h-40 font-mono text-sm resize-y`}
              placeholder={UI_TEXT.PLACEHOLDER.PROMPT}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none">
              Markdown supported
            </div>
          </div>
        </div>

        {/* Image URL Field */}
        <div>
          <label className={LABEL_STYLES.base}>图片 URL（可选）</label>
          <input
            type="text"
            value={formData.imageUrl}
            onChange={(e) => onChange({ ...formData, imageUrl: e.target.value })}
            disabled={submitting}
            className={submitting ? INPUT_STYLES.disabled : INPUT_STYLES.base}
            placeholder={UI_TEXT.PLACEHOLDER.IMAGE_URL}
          />
        </div>

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
            onClick={onSubmit}
            disabled={submitting || !isValid}
            className={BUTTON_STYLES.primary}
            title={!isValid ? '请填写所有必填字段' : ''}
          >
            <Save className="w-4 h-4" />
            {submitting ? MESSAGES.LOADING.SAVE : (isCreating ? '创建' : '保存更改')}
          </button>
        </div>
      </div>
    </div>
  );
}
