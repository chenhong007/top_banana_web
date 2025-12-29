/**
 * useImport Hook
 * Manages data import state and logic for ImportModal
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DataImportMode, ImportSourceType } from '@/types';
import { readFileAsText } from '@/lib/csv-parser';
import { DEFAULTS, API_ENDPOINTS, MESSAGES } from '@/lib/constants';
import { tagKeys } from '@/hooks/queries/useTagsQuery';
import { categoryKeys } from '@/hooks/queries/useCategoriesQuery';
import { modelTagKeys } from '@/hooks/queries/useModelTagsQuery';

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

  const handleJsonImport = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    // 步骤1：先解析本地 JSON 数据
    let items;
    try {
      items = JSON.parse(jsonData);
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

    // 步骤2：验证数据格式
    if (!Array.isArray(items)) {
      setError(MESSAGES.ERROR.IMPORT_JSON_FORMAT);
      setLoading(false);
      return;
    }

    // 步骤3：发送 API 请求
    try {
      const response = await fetch(API_ENDPOINTS.IMPORT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, mode: importMode }),
      });

      // 先获取响应文本
      const responseText = await response.text();
      
      // 检查 HTTP 状态码
      if (!response.ok) {
        // 检查是否是请求体过大的错误
        if (response.status === 413 || responseText.includes('Request Entity Too Large') || responseText.includes('PayloadTooLargeError')) {
          setError(`请求数据过大（${items.length} 条记录）。请尝试分批导入或减少数据量。`);
        } else {
          setError(`服务器错误 (${response.status}): ${responseText.substring(0, 200)}`);
        }
        setLoading(false);
        return;
      }

      // 解析响应 JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        setError(`服务器响应格式错误: ${responseText.substring(0, 200)}`);
        setLoading(false);
        return;
      }

      if (result.success) {
        setSuccess(MESSAGES.SUCCESS.IMPORT(result.data.imported));
        invalidateRelatedQueries();
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      } else {
        setError(result.error || MESSAGES.ERROR.IMPORT);
      }
    } catch (err) {
      setError(MESSAGES.ERROR.NETWORK(err instanceof Error ? err.message : MESSAGES.ERROR.UNKNOWN));
    } finally {
      setLoading(false);
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
  };
}

