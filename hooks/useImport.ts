/**
 * useImport Hook
 * Manages data import state and logic for ImportModal
 * v2.0: 支持分批导入，避免 Vercel 504 超时
 */

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DataImportMode, ImportSourceType } from '@/types';
import { readFileAsText } from '@/lib/csv-parser';
import { DEFAULTS, API_ENDPOINTS, MESSAGES } from '@/lib/constants';
import { tagKeys } from '@/hooks/queries/useTagsQuery';
import { categoryKeys } from '@/hooks/queries/useCategoriesQuery';
import { modelTagKeys } from '@/hooks/queries/useModelTagsQuery';

// 分批导入配置
const BATCH_SIZE = 100; // 每批导入的数量，避免超时（优化后可以增大）
const BATCH_DELAY = 300; // 每批之间的延迟（毫秒）（优化后可以减少）

// 重复统计类型
interface DuplicateStats {
  byImageUrl: number;
  bySource: number;
  byEffect: number;
  byPromptSimilarity: number;
  total: number;
}

// 分批导入进度类型
interface BatchProgress {
  current: number;
  total: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;      // 因重复被跳过的数量
  duplicateStats?: DuplicateStats; // 详细的重复统计
  isRunning: boolean;
}

export function useImport(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ImportSourceType>('csv');
  const [feishuUrl, setFeishuUrl] = useState<string>(DEFAULTS.FEISHU_URL);
  const [cookie, setCookie] = useState<string>('');
  const [jsonData, setJsonData] = useState<string>('');
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [importMode, setImportMode] = useState<DataImportMode>(DEFAULTS.IMPORT_MODE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // 新增：快速模式 - 跳过相似度检查，大幅提升导入速度
  const [fastMode, setFastMode] = useState(false);
  
  // 分批导入进度状态
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    current: 0,
    total: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
    duplicateStats: undefined,
    isRunning: false,
  });
  
  // 用于取消导入的 ref
  const cancelRef = useRef(false);

  /**
   * 使标签、分类和模型标签的缓存失效
   * 导入时可能创建了新的标签/分类/模型标签，需要刷新这些列表
   */
  const invalidateRelatedQueries = () => {
    queryClient.invalidateQueries({ queryKey: tagKeys.all });
    queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    queryClient.invalidateQueries({ queryKey: modelTagKeys.all });
  };

  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setJsonFile(file);
      try {
        const text = await readFileAsText(file);
        setJsonData(text);
      } catch (err) {
        setError(MESSAGES.ERROR.IMPORT_FILE_READ(err instanceof Error ? err.message : MESSAGES.ERROR.UNKNOWN));
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      try {
        const text = await readFileAsText(file);
        const previewLength = DEFAULTS.CSV_PREVIEW_LENGTH;
        setCsvText(
          text.substring(0, previewLength) +
            (text.length > previewLength ? '\n...(已截取前1000字符)' : '')
        );
      } catch (err) {
        setError(MESSAGES.ERROR.IMPORT_FILE_READ(err instanceof Error ? err.message : MESSAGES.ERROR.UNKNOWN));
      }
    }
  };

  const handleFeishuImport = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const scrapeResponse = await fetch(API_ENDPOINTS.IMPORT_FEISHU, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: feishuUrl, cookie: cookie || undefined }),
      });

      const scrapeResult = await scrapeResponse.json();

      if (!scrapeResult.success) {
        setError(scrapeResult.message || scrapeResult.error);
        if (scrapeResult.requiresAuth) {
          setError(MESSAGES.ERROR.IMPORT_FEISHU_AUTH);
        }
        setLoading(false);
        return;
      }

      const importResponse = await fetch(API_ENDPOINTS.IMPORT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: scrapeResult.data.items,
          mode: importMode,
        }),
      });

      const importResult = await importResponse.json();

      if (importResult.success) {
        setSuccess(MESSAGES.SUCCESS.IMPORT(importResult.data.imported));
        invalidateRelatedQueries();
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      } else {
        setError(importResult.error || MESSAGES.ERROR.IMPORT);
      }
    } catch (err) {
      setError(MESSAGES.ERROR.NETWORK(err instanceof Error ? err.message : MESSAGES.ERROR.UNKNOWN));
    } finally {
      setLoading(false);
    }
  };

  // 单批次导入结果类型
  interface BatchResult {
    success: boolean;
    imported: number;
    skipped: number;
    duplicateStats?: DuplicateStats;
    error?: string;
  }

  /**
   * 分批导入单个批次
   */
  const importBatch = async (
    items: unknown[], 
    batchMode: DataImportMode, 
    isFirstBatch: boolean
  ): Promise<BatchResult> => {
    try {
      // 第一批使用用户选择的模式，后续批次总是使用 merge 模式
      const actualMode = isFirstBatch ? batchMode : 'merge';
      
      const response = await fetch(API_ENDPOINTS.IMPORT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items, 
          mode: actualMode,
          // 快速模式：跳过相似度检查，大幅提升导入速度
          fastMode: fastMode,
          // 采样检查：只检查最近200条记录
          sampleSize: 200,
        }),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        if (response.status === 504) {
          return { success: false, imported: 0, skipped: 0, error: '请求超时，请减少批次大小' };
        }
        if (response.status === 413) {
          return { success: false, imported: 0, skipped: 0, error: '请求数据过大' };
        }
        return { success: false, imported: 0, skipped: 0, error: `服务器错误 (${response.status})` };
      }

      const result = JSON.parse(responseText);
      if (result.success) {
        // 计算被跳过的数量（重复的）
        const duplicateStats = result.data.duplicatesFiltered as DuplicateStats | undefined;
        const skipped = duplicateStats?.total || 0;
        return { 
          success: true, 
          imported: result.data.imported,
          skipped,
          duplicateStats,
        };
      } else {
        return { success: false, imported: 0, skipped: 0, error: result.error };
      }
    } catch (err) {
      return { 
        success: false, 
        imported: 0, 
        skipped: 0,
        error: err instanceof Error ? err.message : '网络错误' 
      };
    }
  };

  /**
   * 取消分批导入
   */
  const cancelBatchImport = () => {
    cancelRef.current = true;
  };

  const handleJsonImport = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    cancelRef.current = false;

    // 步骤1：先解析本地 JSON 数据
    let items: unknown[];
    try {
      const parsed = JSON.parse(jsonData);
      
      // 支持两种格式：
      // 1. 数据库导出格式: { version, data: { prompts: [...] } }
      // 2. 简单数组格式: [...]
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === 'object' && parsed.data?.prompts && Array.isArray(parsed.data.prompts)) {
        // 数据库导出格式，提取 prompts 数组
        items = parsed.data.prompts;
        console.log(`[Import] 检测到数据库导出格式 (v${parsed.version || 'unknown'})，共 ${items.length} 条 prompts`);
      } else if (parsed && typeof parsed === 'object' && parsed.prompts && Array.isArray(parsed.prompts)) {
        // 兼容直接 { prompts: [...] } 格式
        items = parsed.prompts;
      } else {
        setError('JSON 格式错误：需要数组格式，或包含 data.prompts 的数据库导出格式');
        setLoading(false);
        return;
      }
    } catch (parseErr) {
      // JSON 解析错误 - 提供详细的错误位置信息
      if (parseErr instanceof SyntaxError) {
        const errorMessage = parseErr.message;
        const positionMatch = errorMessage.match(/position\s+(\d+)/i);
        
        if (positionMatch && jsonData) {
          const position = parseInt(positionMatch[1], 10);
          const beforeError = jsonData.substring(0, position);
          const lines = beforeError.split('\n');
          const lineNumber = lines.length;
          const columnNumber = lines[lines.length - 1].length + 1;
          
          // 获取错误行的上下文
          const allLines = jsonData.split('\n');
          const errorLine = allLines[lineNumber - 1] || '';
          const trimmedLine = errorLine.length > 50 
            ? errorLine.substring(0, 50) + '...' 
            : errorLine;
          
          setError(
            `JSON 格式错误：第 ${lineNumber} 行，第 ${columnNumber} 列\n` +
            `错误内容: "${trimmedLine}"\n` +
            `原始错误: ${errorMessage}`
          );
        } else {
          setError(MESSAGES.ERROR.IMPORT_JSON_SYNTAX(errorMessage));
        }
      } else {
        setError(MESSAGES.ERROR.IMPORT_JSON_SYNTAX(parseErr instanceof Error ? parseErr.message : '未知错误'));
      }
      setLoading(false);
      return;
    }

    // 步骤2：验证数据格式（此时 items 已经是数组）
    if (!Array.isArray(items) || items.length === 0) {
      setError('没有可导入的数据');
      setLoading(false);
      return;
    }

    // 步骤3：分批导入
    const totalItems = items.length;
    const totalBatches = Math.ceil(totalItems / BATCH_SIZE);
    
    // 如果数据量小，直接一次导入
    if (totalItems <= BATCH_SIZE) {
      try {
        const result = await importBatch(items, importMode, true);
        if (result.success) {
          setSuccess(MESSAGES.SUCCESS.IMPORT(result.imported));
          invalidateRelatedQueries();
          setTimeout(() => onSuccess?.(), 1500);
        } else {
          setError(result.error || MESSAGES.ERROR.IMPORT);
        }
      } catch (err) {
        setError(MESSAGES.ERROR.NETWORK(err instanceof Error ? err.message : MESSAGES.ERROR.UNKNOWN));
      } finally {
        setLoading(false);
      }
      return;
    }

    // 大数据量：分批导入
    setBatchProgress({
      current: 0,
      total: totalBatches,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      duplicateStats: undefined,
      isRunning: true,
    });

    let totalImported = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let lastError = '';
    // 汇总的重复统计
    const aggregatedDuplicateStats: DuplicateStats = {
      byImageUrl: 0,
      bySource: 0,
      byEffect: 0,
      byPromptSimilarity: 0,
      total: 0,
    };

    for (let i = 0; i < totalBatches; i++) {
      // 检查是否取消
      if (cancelRef.current) {
        setError(`导入已取消。已成功导入 ${totalImported} 条，跳过重复 ${totalSkipped} 条，失败 ${totalFailed} 条。`);
        break;
      }

      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, totalItems);
      const batch = items.slice(start, end);

      const result = await importBatch(batch, importMode, i === 0);
      
      if (result.success) {
        totalImported += result.imported;
        totalSkipped += result.skipped;
        
        // 汇总重复统计
        if (result.duplicateStats) {
          aggregatedDuplicateStats.byImageUrl += result.duplicateStats.byImageUrl;
          aggregatedDuplicateStats.bySource += result.duplicateStats.bySource;
          aggregatedDuplicateStats.byEffect += result.duplicateStats.byEffect;
          aggregatedDuplicateStats.byPromptSimilarity += result.duplicateStats.byPromptSimilarity;
          aggregatedDuplicateStats.total += result.duplicateStats.total;
        }
      } else {
        totalFailed += batch.length;
        lastError = result.error || '未知错误';
      }

      setBatchProgress({
        current: i + 1,
        total: totalBatches,
        successCount: totalImported,
        failedCount: totalFailed,
        skippedCount: totalSkipped,
        duplicateStats: aggregatedDuplicateStats.total > 0 ? { ...aggregatedDuplicateStats } : undefined,
        isRunning: i < totalBatches - 1,
      });

      // 批次之间添加延迟，避免请求过于频繁
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // 完成
    setBatchProgress(prev => ({ ...prev, isRunning: false }));
    setLoading(false);

    if (!cancelRef.current) {
      // 构建详细的结果消息
      const buildResultMessage = () => {
        const parts: string[] = [];
        parts.push(`成功导入 ${totalImported} 条`);
        
        if (totalSkipped > 0) {
          parts.push(`跳过重复 ${totalSkipped} 条`);
        }
        
        if (totalFailed > 0) {
          parts.push(`失败 ${totalFailed} 条`);
        }
        
        let message = `分批导入完成！${parts.join('，')}。`;
        
        // 如果有被跳过的，说明详细原因
        if (aggregatedDuplicateStats.total > 0) {
          const details: string[] = [];
          if (aggregatedDuplicateStats.byEffect > 0) {
            details.push(`标题重复: ${aggregatedDuplicateStats.byEffect}`);
          }
          if (aggregatedDuplicateStats.bySource > 0) {
            details.push(`来源重复: ${aggregatedDuplicateStats.bySource}`);
          }
          if (aggregatedDuplicateStats.byImageUrl > 0) {
            details.push(`图片URL重复: ${aggregatedDuplicateStats.byImageUrl}`);
          }
          if (aggregatedDuplicateStats.byPromptSimilarity > 0) {
            details.push(`提示词相似: ${aggregatedDuplicateStats.byPromptSimilarity}`);
          }
          if (details.length > 0) {
            message += `\n跳过原因: ${details.join('、')}`;
          }
        }
        
        if (totalFailed > 0 && lastError) {
          message += `\n最后错误: ${lastError}`;
        }
        
        return message;
      };

      if (totalFailed === 0) {
        setSuccess(buildResultMessage());
        invalidateRelatedQueries();
        setTimeout(() => onSuccess?.(), 2000);
      } else if (totalImported > 0 || totalSkipped > 0) {
        setSuccess(buildResultMessage());
        invalidateRelatedQueries();
      } else {
        setError(`导入失败。${lastError}`);
      }
    }
  };

  const handleCsvImport = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let text = csvText;

      if (csvFile) {
        text = await readFileAsText(csvFile);
      }

      if (!text) {
        setError(MESSAGES.ERROR.IMPORT_CSV_REQUIRED);
        setLoading(false);
        return;
      }

      const parseResponse = await fetch(API_ENDPOINTS.IMPORT_CSV, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: text }),
      });

      const parseResult = await parseResponse.json();

      if (!parseResult.success) {
        setError(parseResult.message || parseResult.error || MESSAGES.ERROR.IMPORT_CSV_PARSE);
        setLoading(false);
        return;
      }

      const importResponse = await fetch(API_ENDPOINTS.IMPORT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: parseResult.data.items,
          mode: importMode,
        }),
      });

      const importResult = await importResponse.json();

      if (importResult.success) {
        setSuccess(MESSAGES.SUCCESS.IMPORT_CSV(parseResult.data.total, importResult.data.imported));
        invalidateRelatedQueries();
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        setError(importResult.error || MESSAGES.ERROR.IMPORT);
      }
    } catch (err) {
      setError(MESSAGES.ERROR.IMPORT + '：' + (err instanceof Error ? err.message : MESSAGES.ERROR.UNKNOWN));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (mode === 'feishu') {
      handleFeishuImport();
    } else if (mode === 'json') {
      handleJsonImport();
    } else if (mode === 'csv') {
      handleCsvImport();
    }
  };

  const resetState = () => {
    setError('');
    setSuccess('');
    setJsonData('');
    setJsonFile(null);
    setCsvText('');
    setCsvFile(null);
  };

  return {
    mode,
    feishuUrl,
    cookie,
    jsonData,
    csvFile,
    csvText,
    importMode,
    loading,
    error,
    success,
    setMode,
    setFeishuUrl,
    setCookie,
    setJsonData,
    jsonFile,
    handleJsonFileChange,
    setCsvFile,
    setCsvText,
    setImportMode,
    handleFileChange,
    handleImport,
    resetState,
    // 分批导入相关
    batchProgress,
    cancelBatchImport,
    // 快速模式相关
    fastMode,
    setFastMode,
  };
}

