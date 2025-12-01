/**
 * TagInput Component
 * Allows selecting from existing tags and creating new tags
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Tag, ChevronDown, Check, Edit2, Trash2 } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/constants';
import { INPUT_STYLES, LABEL_STYLES, BADGE_STYLES } from '@/lib/styles';

// 根据标签名获取对应的样式（与列表保持一致）
const getTagStyle = (tag: string) => {
  const styles = [
    BADGE_STYLES.primary,
    BADGE_STYLES.success,
    BADGE_STYLES.warning,
    BADGE_STYLES.neutral
  ];
  return styles[tag.length % styles.length];
};

interface TagInputProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export default function TagInput({ selectedTags, onChange, disabled }: TagInputProps) {
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all existing tags
  useEffect(() => {
    fetchTags();
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingTag(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.TAGS);
      const result = await response.json();
      if (result.success) {
        setAllTags(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add a tag to selection
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      onChange([...selectedTags, trimmedTag]);
    }
    setInputValue('');
  };

  // Remove a tag from selection
  const removeTag = (tag: string) => {
    onChange(selectedTags.filter(t => t !== tag));
  };

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      removeTag(tag);
    } else {
      addTag(tag);
    }
  };

  // Create new tag
  const createNewTag = async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    // If tag already exists in the list, just add it
    if (allTags.includes(trimmedValue)) {
      addTag(trimmedValue);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.TAGS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedValue }),
      });
      const result = await response.json();
      if (result.success) {
        setAllTags([...allTags, trimmedValue].sort());
        addTag(trimmedValue);
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createNewTag();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Start editing a tag
  const startEditTag = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    setEditingTag(tag);
    setEditValue(tag);
  };

  // Save edited tag
  const saveEditTag = async (oldName: string) => {
    const newName = editValue.trim();
    if (!newName || newName === oldName) {
      setEditingTag(null);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.TAGS, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName }),
      });
      const result = await response.json();
      if (result.success) {
        // Update local state
        setAllTags(allTags.map(t => t === oldName ? newName : t).sort());
        // Update selected tags if the edited tag was selected
        if (selectedTags.includes(oldName)) {
          onChange(selectedTags.map(t => t === oldName ? newName : t));
        }
      }
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
    setEditingTag(null);
  };

  // Delete a tag
  const deleteTag = async (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    if (!confirm(`确定要删除标签 "${tag}" 吗？这将同时从所有提示词中移除此标签。`)) {
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.TAGS}?name=${encodeURIComponent(tag)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setAllTags(allTags.filter(t => t !== tag));
        removeTag(tag);
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  // Filter tags based on input
  const filteredTags = allTags.filter(tag => 
    tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showCreateOption = inputValue.trim() && !allTags.includes(inputValue.trim());

  return (
    <div className="relative" ref={dropdownRef}>
      <label className={LABEL_STYLES.base}>标签</label>
      
      {/* Selected Tags Display */}
      <div className={`${INPUT_STYLES.base} min-h-[42px] h-auto flex flex-wrap gap-2 p-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {selectedTags.map(tag => (
          <span
            key={tag}
            className={`${getTagStyle(tag)} gap-1`}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="ml-1 hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {selectedTags.length === 0 && (
          <span className="text-gray-400 text-sm">点击选择或创建标签...</span>
        )}
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-hidden">
          {/* Search/Create Input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="搜索或创建新标签..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Tags List */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">加载中...</div>
            ) : (
              <>
                {/* Create New Tag Option */}
                {showCreateOption && (
                  <button
                    type="button"
                    onClick={createNewTag}
                    className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-blue-600 hover:bg-blue-50 border-b border-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                    创建新标签: <span className="font-medium">"{inputValue.trim()}"</span>
                  </button>
                )}

                {/* Existing Tags */}
                {filteredTags.length > 0 ? (
                  filteredTags.map(tag => (
                    <div
                      key={tag}
                      className={`px-3 py-2 flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 group ${
                        selectedTags.includes(tag) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        if (editingTag !== tag) {
                          toggleTag(tag);
                        }
                      }}
                    >
                      {editingTag === tag ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveEditTag(tag);
                            } else if (e.key === 'Escape') {
                              setEditingTag(null);
                            }
                          }}
                          onBlur={() => saveEditTag(tag)}
                          className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              selectedTags.includes(tag) 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'border-gray-300'
                            }`}>
                              {selectedTags.includes(tag) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <Tag className="w-3.5 h-3.5 text-gray-400" />
                            <span className={selectedTags.includes(tag) ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                              {tag}
                            </span>
                          </div>
                          
                          {/* Edit/Delete buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => startEditTag(e, tag)}
                              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                              title="编辑标签"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => deleteTag(e, tag)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                              title="删除标签"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  !showCreateOption && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      {inputValue ? '没有找到匹配的标签' : '暂无标签，输入名称创建新标签'}
                    </div>
                  )
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              点击选择标签，输入名称创建新标签
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

