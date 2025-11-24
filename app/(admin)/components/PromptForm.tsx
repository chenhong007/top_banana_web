/**
 * PromptForm Component
 * Form for creating and editing prompts
 */

import { CreatePromptRequest } from '@/types';
import { Save, X } from 'lucide-react';
import { UI_TEXT, MESSAGES } from '@/lib/constants';
import { INPUT_STYLES, BUTTON_STYLES, CARD_STYLES, LABEL_STYLES } from '@/lib/styles';

interface PromptFormProps {
  formData: CreatePromptRequest;
  isCreating: boolean;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onChange: (data: CreatePromptRequest) => void;
  onTagsChange: (tags: string) => void;
}

export default function PromptForm({
  formData,
  isCreating,
  submitting,
  onSubmit,
  onCancel,
  onChange,
  onTagsChange,
}: PromptFormProps) {
  // Validate form
  const isValid = formData.effect && formData.description && formData.prompt && formData.source;
  
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
            <label className={LABEL_STYLES.required}>效果目标</label>
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

        {/* Tags Field */}
        <div>
          <label className={LABEL_STYLES.base}>标签（用逗号分隔）</label>
          <input
            type="text"
            value={formData.tags.join(', ')}
            onChange={(e) => onTagsChange(e.target.value)}
            disabled={submitting}
            className={submitting ? INPUT_STYLES.disabled : INPUT_STYLES.base}
            placeholder={UI_TEXT.PLACEHOLDER.TAGS}
          />
          <p className="text-xs text-gray-400 mt-1.5">例如: 文案, 营销, 小红书</p>
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

