/**
 * useImport Hook
 * Manages data import state and logic for ImportModal
 */

import { useState } from 'react';
import { DataImportMode, ImportSourceType } from '@/types';
import { readFileAsText } from '@/lib/csv-parser';
import { DEFAULTS, API_ENDPOINTS, MESSAGES } from '@/lib/constants';

export function useImport(onSuccess?: () => void) {
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

    try {
      const items = JSON.parse(jsonData);

      if (!Array.isArray(items)) {
        setError(MESSAGES.ERROR.IMPORT_JSON_FORMAT);
        setLoading(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.IMPORT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, mode: importMode }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(MESSAGES.SUCCESS.IMPORT(result.data.imported));
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      } else {
        setError(result.error || MESSAGES.ERROR.IMPORT);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError(MESSAGES.ERROR.IMPORT_JSON_SYNTAX(err.message));
      } else {
        setError(MESSAGES.ERROR.IMPORT + '：' + (err instanceof Error ? err.message : MESSAGES.ERROR.UNKNOWN));
      }
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

