/**
 * JsonImportForm Component
 * Form for JSON data import
 * 优化：所有文件只显示摘要信息，不显示完整内容
 */

import { FileJson, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { useRef, useMemo } from 'react';
import { LABEL_STYLES } from '@/lib/styles';

interface JsonImportFormProps {
  jsonData: string;
  onChange: (data: string) => void;
  jsonFile?: File | null;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 解析 JSON 数据获取摘要信息
 */
function getJsonSummary(jsonData: string): { itemCount: number; isValid: boolean; error?: string } {
  if (!jsonData) return { itemCount: 0, isValid: false };
  try {
    const items = JSON.parse(jsonData);
    if (Array.isArray(items)) {
      return { itemCount: items.length, isValid: true };
    }
    return { itemCount: 0, isValid: false, error: '数据格式错误：需要数组格式' };
  } catch (e) {
    return { itemCount: 0, isValid: false, error: 'JSON 格式无效' };
  }
}

export default function JsonImportForm({ 
  jsonData, 
  onChange, 
  jsonFile, 
  onFileChange 
}: JsonImportFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取 JSON 摘要信息
  const jsonSummary = useMemo(() => getJsonSummary(jsonData), [jsonData]);

  return (
    <div className="space-y-4">
      {onFileChange && (
        <div>
          <label className={`${LABEL_STYLES.base} mb-2`}>
            上传 JSON 文件
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,*/*"
            onChange={onFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center gap-2"
          >
            <FileJson className="w-12 h-12 text-gray-400" />
            <span className="text-gray-600">
              {jsonFile ? jsonFile.name : '点击选择 JSON 文件'}
            </span>
            <span className="text-xs text-gray-500">
              支持 .json 格式
            </span>
          </button>
        </div>
      )}

      {/* 文件已加载：显示摘要信息 */}
      {jsonData && jsonSummary.isValid && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                文件已加载成功
              </p>
              <div className="mt-2 space-y-1 text-sm text-green-700">
                {jsonFile && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>文件名: {jsonFile.name}</span>
                  </div>
                )}
                <div>文件大小: {formatFileSize(jsonData.length)}</div>
                <div className="font-medium">
                  共 {jsonSummary.itemCount.toLocaleString()} 条数据待导入
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 文件加载失败：显示错误信息 */}
      {jsonData && !jsonSummary.isValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                文件解析失败
              </p>
              <div className="mt-2 text-sm text-red-700">
                {jsonSummary.error || '数据格式错误'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 已选择文件时提供清除按钮 */}
      {jsonData && (
        <button
          onClick={() => {
            onChange('');
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }}
          className="text-sm text-gray-500 hover:text-red-600 underline"
        >
          清除已选文件，重新选择
        </button>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>支持的字段：</strong>
        </p>
        <ul className="text-sm text-gray-600 mt-2 ml-4 list-disc space-y-1">
          <li>效果 / effect / title - 必填</li>
          <li>描述 / description - 必填 (支持从title回退)</li>
          <li>提示词 / prompt - 必填</li>
          <li>来源 / source / link - 必填</li>
          <li>标签 / tags / category - 可选</li>
          <li>图片 / imageUrl / preview - 可选</li>
        </ul>
      </div>
    </div>
  );
}
