/**
 * MultiImageUpload Component
 * 多图片上传组件，支持拖拽上传、URL 上传和文件选择
 * 最多支持 6 张图片，第一张作为封面预览
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Link, X, Loader2, Check, ImageIcon, GripVertical, Star } from 'lucide-react';

interface MultiImageUploadProps {
  value?: string[]; // 图片 URL 数组
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  className?: string;
  maxImages?: number; // 最大图片数量，默认 6
}

type UploadMode = 'file' | 'url';

export default function MultiImageUpload({
  value = [],
  onChange,
  disabled = false,
  className = '',
  maxImages = 6,
}: MultiImageUploadProps) {
  const [mode, setMode] = useState<UploadMode>('file');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAddMore = value.length < maxImages;

  // 上传单个文件
  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
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

      return result.data.url;
    } catch (err) {
      console.error('Upload failed:', err);
      return null;
    }
  }, []);

  // 上传多个文件
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (disabled) return;
    
    const fileArray = Array.from(files);
    const remainingSlots = maxImages - value.length;
    const filesToUpload = fileArray.slice(0, remainingSlots);
    
    if (filesToUpload.length === 0) {
      setError(`最多只能上传 ${maxImages} 张图片`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = filesToUpload.map(file => uploadFile(file));
      const results = await Promise.all(uploadPromises);
      const successfulUrls = results.filter((url): url is string => url !== null);
      
      if (successfulUrls.length > 0) {
        onChange([...value, ...successfulUrls]);
      }
      
      if (successfulUrls.length < filesToUpload.length) {
        setError(`${filesToUpload.length - successfulUrls.length} 张图片上传失败`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }, [disabled, maxImages, value, uploadFile, onChange]);

  // 从 URL 上传
  const uploadFromUrl = useCallback(async () => {
    if (!urlInput.trim()) {
      setError('请输入图片 URL');
      return;
    }

    if (!canAddMore) {
      setError(`最多只能上传 ${maxImages} 张图片`);
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

      onChange([...value, result.data.url]);
      setUrlInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }, [urlInput, canAddMore, maxImages, value, onChange]);

  // 处理文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadFiles]);

  // 处理拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && canAddMore) {
      setDragOver(true);
    }
  }, [disabled, canAddMore]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled || !canAddMore) return;

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      uploadFiles(files);
    } else {
      setError('请上传图片文件');
    }
  }, [disabled, canAddMore, uploadFiles]);

  // 删除图片
  const handleRemove = useCallback((index: number) => {
    const newUrls = [...value];
    newUrls.splice(index, 1);
    onChange(newUrls);
  }, [value, onChange]);

  // 设为封面（移到第一位）
  const handleSetCover = useCallback((index: number) => {
    if (index === 0) return;
    const newUrls = [...value];
    const [removed] = newUrls.splice(index, 1);
    newUrls.unshift(removed);
    onChange(newUrls);
  }, [value, onChange]);

  // 拖拽排序
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleDragOverItem = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newUrls = [...value];
    const [removed] = newUrls.splice(draggedIndex, 1);
    newUrls.splice(index, 0, removed);
    onChange(newUrls);
    setDraggedIndex(index);
  }, [draggedIndex, value, onChange]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 已上传图片列表 */}
      {value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              已上传 {value.length}/{maxImages} 张图片
            </span>
            <span className="text-xs text-gray-400">拖拽调整顺序，第一张为封面</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {value.map((url, index) => (
              <div
                key={`${url}-${index}`}
                draggable={!disabled}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOverItem(e, index)}
                className={`
                  relative group rounded-lg overflow-hidden border-2 aspect-square
                  ${index === 0 ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}
                  ${draggedIndex === index ? 'opacity-50' : ''}
                  ${!disabled ? 'cursor-grab active:cursor-grabbing' : ''}
                  transition-all duration-200 hover:shadow-lg
                `}
              >
                {/* 封面标识 */}
                {index === 0 && (
                  <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    封面
                  </div>
                )}
                
                {/* 序号 */}
                <div className="absolute top-1 right-1 z-10 w-5 h-5 bg-black/50 text-white text-xs rounded-full flex items-center justify-center">
                  {index + 1}
                </div>

                {/* 图片 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`图片 ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="12">加载失败</text></svg>';
                  }}
                />

                {/* 操作遮罩 */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {/* 拖拽手柄 */}
                  <div className="p-1.5 bg-white/90 rounded-md text-gray-600">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  
                  {/* 设为封面 */}
                  {index !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetCover(index)}
                      disabled={disabled}
                      className="p-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                      title="设为封面"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* 删除 */}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    disabled={disabled}
                    className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                    title="删除图片"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 上传区域 - 只有还能添加图片时才显示 */}
      {canAddMore && (
        <>
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
                multiple
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
                  <ImageIcon className="w-8 h-8" />
                  <div>
                    <span className="text-sm font-medium text-gray-700">点击或拖拽上传图片</span>
                    <p className="text-xs text-gray-400 mt-1">
                      支持多选，JPG/PNG/GIF/WebP，单张最大 10MB
                    </p>
                    <p className="text-xs text-blue-500 mt-1">
                      还可添加 {maxImages - value.length} 张图片
                    </p>
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
                  onKeyDown={(e) => e.key === 'Enter' && uploadFromUrl()}
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
                图片将下载并上传到 R2 存储，还可添加 {maxImages - value.length} 张图片
              </p>
            </div>
          )}
        </>
      )}

      {/* 已达上限提示 */}
      {!canAddMore && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-600">
          <Check className="w-4 h-4" />
          已达到最大图片数量 ({maxImages} 张)
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <X className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}

