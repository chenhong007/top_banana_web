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
 * 获取 JSON 错误的详细位置信息
 * 解析错误消息中的位置信息，并找出对应的行号和上下文
 */
function getJsonErrorDetails(jsonData: string, error: SyntaxError): { 
  line: number; 
  column: number; 
  context: string; 
  message: string;
} {
  const errorMessage = error.message;
  
  // 尝试从错误消息中提取位置信息
  // 常见格式: "Unexpected token X at position N" 或 "Unexpected token X in JSON at position N"
  const positionMatch = errorMessage.match(/position\s+(\d+)/i);
  
  if (positionMatch) {
    const position = parseInt(positionMatch[1], 10);
    
    // 计算行号和列号
    const beforeError = jsonData.substring(0, position);
    const lines = beforeError.split('\n');
    const lineNumber = lines.length;
    const columnNumber = lines[lines.length - 1].length + 1;
    
    // 获取错误行的上下文（前后各2行）
    const allLines = jsonData.split('\n');
    const startLine = Math.max(0, lineNumber - 3);
    const endLine = Math.min(allLines.length, lineNumber + 2);
    const contextLines = allLines.slice(startLine, endLine).map((line, idx) => {
      const currentLineNum = startLine + idx + 1;
      const prefix = currentLineNum === lineNumber ? '>>> ' : '    ';
      const lineNumStr = String(currentLineNum).padStart(5, ' ');
      return `${prefix}${lineNumStr} | ${line}`;
    });
    
    return {
      line: lineNumber,
      column: columnNumber,
      context: contextLines.join('\n'),
      message: errorMessage,
    };
  }
  
  // 如果无法解析位置，尝试逐行解析来找到错误
  const lines = jsonData.split('\n');
  let accumulatedLength = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const testJson = lines.slice(0, i + 1).join('\n');
    try {
      // 尝试解析，看是否能找到第一个错误
      JSON.parse(testJson + (testJson.trim().endsWith(']') || testJson.trim().endsWith('}') ? '' : ']}'));
    } catch {
      // 继续尝试
    }
    accumulatedLength += lines[i].length + 1;
  }
  
  return {
    line: 0,
    column: 0,
    context: '',
    message: errorMessage,
  };
}

/**
 * 数据库导出格式的统计信息
 */
interface ExportStatistics {
  prompts: number;
  categories?: number;
  modelTags?: number;
  tags?: number;
  images?: number;
}

/**
 * JSON 摘要信息
 */
interface JsonSummaryResult {
  itemCount: number;
  isValid: boolean;
  error?: string;
  errorDetails?: {
    line: number;
    column: number;
    context: string;
    message: string;
  };
  // 数据库导出格式的额外信息
  isExportFormat?: boolean;
  exportVersion?: string;
  exportedAt?: string;
  statistics?: ExportStatistics;
}

/**
 * 解析 JSON 数据获取摘要信息
 * 支持两种格式：
 * 1. 简单数组格式: [...]
 * 2. 数据库导出格式: { version, exportedAt, statistics, data: { prompts: [...] } }
 */
function getJsonSummary(jsonData: string): JsonSummaryResult {
  if (!jsonData) return { itemCount: 0, isValid: false };
  try {
    const parsed = JSON.parse(jsonData);
    
    // 格式1: 简单数组
    if (Array.isArray(parsed)) {
      return { itemCount: parsed.length, isValid: true };
    }
    
    // 格式2: 数据库导出格式 { version, data: { prompts: [...] } }
    if (parsed && typeof parsed === 'object' && parsed.data?.prompts && Array.isArray(parsed.data.prompts)) {
      return { 
        itemCount: parsed.data.prompts.length, 
        isValid: true,
        isExportFormat: true,
        exportVersion: parsed.version,
        exportedAt: parsed.exportedAt,
        statistics: parsed.statistics,
      };
    }
    
    // 格式3: 兼容 { prompts: [...] }
    if (parsed && typeof parsed === 'object' && parsed.prompts && Array.isArray(parsed.prompts)) {
      return { 
        itemCount: parsed.prompts.length, 
        isValid: true,
      };
    }
    
    return { itemCount: 0, isValid: false, error: '数据格式错误：需要数组格式，或包含 data.prompts 的数据库导出格式' };
  } catch (e) {
    if (e instanceof SyntaxError) {
      const errorDetails = getJsonErrorDetails(jsonData, e);
      const errorMsg = errorDetails.line > 0 
        ? `JSON 格式错误（第 ${errorDetails.line} 行，第 ${errorDetails.column} 列）`
        : `JSON 格式错误：${e.message}`;
      return { 
        itemCount: 0, 
        isValid: false, 
        error: errorMsg,
        errorDetails,
      };
    }
    return { itemCount: 0, isValid: false, error: 'JSON 解析错误' };
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
                {jsonSummary.isExportFormat && (
                  <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
                    数据库导出格式 v{jsonSummary.exportVersion || '?'}
                  </span>
                )}
              </p>
              <div className="mt-2 space-y-1 text-sm text-green-700">
                {jsonFile && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>文件名: {jsonFile.name}</span>
                  </div>
                )}
                <div>文件大小: {formatFileSize(jsonData.length)}</div>
                {jsonSummary.exportedAt && (
                  <div>导出时间: {new Date(jsonSummary.exportedAt).toLocaleString('zh-CN')}</div>
                )}
                <div className="font-medium">
                  共 {jsonSummary.itemCount.toLocaleString()} 条数据待导入
                </div>
                {/* 数据库导出格式的详细统计 */}
                {jsonSummary.statistics && (
                  <div className="mt-2 pt-2 border-t border-green-200 text-xs text-green-600">
                    <span className="font-medium">原始统计: </span>
                    {jsonSummary.statistics.categories && `${jsonSummary.statistics.categories} 个分类 · `}
                    {jsonSummary.statistics.modelTags && `${jsonSummary.statistics.modelTags} 个模型标签 · `}
                    {jsonSummary.statistics.tags && `${jsonSummary.statistics.tags} 个标签 · `}
                    {jsonSummary.statistics.images && `${jsonSummary.statistics.images} 张图片`}
                  </div>
                )}
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
              {jsonSummary.errorDetails?.context && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-red-800 mb-1">
                    错误位置附近的代码（&gt;&gt;&gt; 标记的是错误行）：
                  </p>
                  <pre className="text-xs bg-red-100 p-3 rounded overflow-x-auto whitespace-pre font-mono border border-red-200">
                    {jsonSummary.errorDetails.context}
                  </pre>
                  <p className="text-xs text-red-600 mt-2">
                    提示：请检查该行附近是否有缺少逗号、引号未闭合、括号不匹配等问题
                  </p>
                </div>
              )}
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
          <strong>支持的格式：</strong>
        </p>
        <ul className="text-sm text-gray-600 mt-2 ml-4 list-disc space-y-1">
          <li><strong>数据库导出格式</strong> - 包含 version, data.prompts 的完整备份</li>
          <li><strong>简单数组格式</strong> - 直接的 prompt 对象数组</li>
        </ul>
        <p className="text-sm text-gray-700 mt-3">
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
