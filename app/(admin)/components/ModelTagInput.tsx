/**
 * ModelTagInput Component
 * Allows selecting from existing AI model tags
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check, Cpu } from 'lucide-react';
import { API_ENDPOINTS, DEFAULT_MODEL_TAGS } from '@/lib/constants';
import { INPUT_STYLES, LABEL_STYLES } from '@/lib/styles';

// AI模型标签颜色映射
const MODEL_TAG_COLORS: Record<string, string> = Object.fromEntries(
  DEFAULT_MODEL_TAGS.map(tag => [tag.name, tag.color])
);

interface ModelTagItem {
  id: string;
  name: string;
  color?: string;
  type?: string;
}

interface ModelTagInputProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export default function ModelTagInput({ selectedTags, onChange, disabled }: ModelTagInputProps) {
  const [allModelTags, setAllModelTags] = useState<ModelTagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch all existing model tags
  useEffect(() => {
    fetchModelTags();
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchModelTags = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.MODEL_TAGS);
      const result = await response.json();
      if (result.success && result.data) {
        setAllModelTags(result.data);
      } else {
        // 如果API没有返回数据，使用默认标签
        setAllModelTags(DEFAULT_MODEL_TAGS.map((tag, index) => ({
          id: `default-${index}`,
          name: tag.name,
          color: tag.color,
          type: tag.type,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch model tags:', error);
      // 发生错误时使用默认标签
      setAllModelTags(DEFAULT_MODEL_TAGS.map((tag, index) => ({
        id: `default-${index}`,
        name: tag.name,
        color: tag.color,
        type: tag.type,
      })));
    } finally {
      setLoading(false);
    }
  };

  // Toggle tag selection
  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter(t => t !== tagName));
    } else {
      onChange([...selectedTags, tagName]);
    }
  };

  // Remove a tag from selection
  const removeTag = (tagName: string) => {
    onChange(selectedTags.filter(t => t !== tagName));
  };

  // Filter tags based on input
  const filteredTags = allModelTags.filter(tag => 
    (tag.name || '').toLowerCase().includes(inputValue.toLowerCase())
  );

  // Get color for a tag
  const getTagColor = (tagName: string) => {
    const tag = allModelTags.find(t => t.name === tagName);
    return tag?.color || MODEL_TAG_COLORS[tagName] || '#6B7280';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className={LABEL_STYLES.base}>
        <Cpu className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
        AI 模型标签（可选）
      </label>
      
      {/* Selected Tags Display */}
      <div 
        className={`${INPUT_STYLES.base} min-h-[42px] h-auto flex flex-wrap gap-2 p-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {selectedTags.map(tagName => {
          const color = getTagColor(tagName);
          return (
            <span
              key={tagName}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white gap-1"
              style={{ backgroundColor: color }}
            >
              <Cpu className="w-3 h-3" />
              {tagName}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tagName);
                  }}
                  className="ml-1 hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          );
        })}
        {selectedTags.length === 0 && (
          <span className="text-gray-400 text-sm">点击选择 AI 模型...</span>
        )}
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
              placeholder="搜索 AI 模型..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Tags List */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">加载中...</div>
            ) : filteredTags.length > 0 ? (
              filteredTags.map(tag => (
                <div
                  key={tag.id}
                  className={`px-3 py-2 flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 ${
                    selectedTags.includes(tag.name) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => toggleTag(tag.name)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedTags.includes(tag.name) 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {selectedTags.includes(tag.name) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span 
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white gap-1"
                      style={{ backgroundColor: tag.color || '#6B7280' }}
                    >
                      <Cpu className="w-3 h-3" />
                      {tag.name}
                    </span>
                    {tag.type && (
                      <span className="text-xs text-gray-400">{tag.type}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                {inputValue ? '没有找到匹配的 AI 模型' : '暂无 AI 模型标签'}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              选择该提示词适用的 AI 模型
            </p>
          </div>
        </div>
      )}
    </div>
  );
}





