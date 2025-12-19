/**
 * ImageUpload Component
 * 图片上传组件，支持拖拽上传、URL 上传和文件选择
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Link, X, Loader2, Check } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  className?: string;
}

type UploadMode = 'file' | 'url';

export default function ImageUpload({
  value,
  onChange,
  disabled = false,
  className = '',
}: ImageUploadProps) {
  const [mode, setMode] = useState<UploadMode>('file');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 上传文件
  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '上传失败');
      }

      onChange(result.data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  // 从 URL 上传
  const uploadFromUrl = useCallback(async () => {
    if (!urlInput.trim()) {
      setError('请输入图片 URL');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/images/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '上传失败');
      }

      onChange(result.data.url);
      setUrlInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }, [urlInput, onChange]);

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  // 处理拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadFile(file);
    } else {
      setError('请上传图片文件');
    }
  }, [disabled, uploadFile]);

  // 清除图片
  const handleClear = useCallback(() => {
    onChange('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);


  return (
    <div className={`space-y-3 ${className}`}>
      {/* 模式切换 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('file')}
          disabled={disabled || uploading}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            mode === 'file'
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          文件上传
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          disabled={disabled || uploading}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            mode === 'url'
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Link className="w-4 h-4" />
          URL 上传
        </button>
      </div>

      {/* 文件上传区域 */}
      {mode === 'file' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
            transition-all duration-200
            ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
            ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
          />
          
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-blue-600">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm font-medium">上传中...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Upload className="w-8 h-8" />
              <div>
                <span className="text-sm font-medium text-gray-700">点击或拖拽上传图片</span>
                <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG、GIF、WebP，最大 10MB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* URL 上传区域 */}
      {mode === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="输入图片 URL"
              disabled={disabled || uploading}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={uploadFromUrl}
              disabled={disabled || uploading || !urlInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              上传到 R2
            </button>
          </div>
          <p className="text-xs text-gray-400">
            图片将下载并上传到 R2 存储
          </p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <X className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* 预览区域 */}
      {value && (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <div className="aspect-video relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999">加载失败</text></svg>';
              }}
            />
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-md flex items-center gap-1">
              <Check className="w-3 h-3" />
              已选择
            </span>
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
              title="清除图片"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 bg-white border-t border-gray-200">
            <p className="text-xs text-gray-500 truncate" title={value}>
              {value}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

