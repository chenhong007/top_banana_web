'use client';

import { X, Upload } from 'lucide-react';
import ImportTabs from './import/ImportTabs';
import CsvImportForm from './import/CsvImportForm';
import FeishuImportForm from './import/FeishuImportForm';
import JsonImportForm from './import/JsonImportForm';
import ImportModeSelector from './import/ImportModeSelector';
import StatusMessage from './import/StatusMessage';
import { useImport } from '@/hooks/useImport';
import { BUTTON_STYLES, ICON_BUTTON_STYLES } from '@/lib/styles';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function ImportModal({ isOpen, onClose, onImportSuccess }: ImportModalProps) {
  const {
    mode,
    feishuUrl,
    cookie,
    jsonData,
    jsonFile,
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
    setCsvFile,
    setCsvText,
    setImportMode,
    handleFileChange,
    handleJsonFileChange,
    handleImport,
    resetState,
  } = useImport(onImportSuccess);

  if (!isOpen) return null;

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">导入数据</h2>
          <button
            onClick={handleClose}
            className={ICON_BUTTON_STYLES.ghost}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <ImportTabs mode={mode} onChange={setMode} />
          </div>

          {mode === 'csv' && (
            <CsvImportForm
              csvFile={csvFile}
              csvText={csvText}
              onFileChange={handleFileChange}
              onTextChange={setCsvText}
            />
          )}

          {mode === 'feishu' && (
            <FeishuImportForm
              feishuUrl={feishuUrl}
              cookie={cookie}
              onUrlChange={setFeishuUrl}
              onCookieChange={setCookie}
            />
          )}

          {mode === 'json' && (
            <JsonImportForm
              jsonData={jsonData}
              onChange={setJsonData}
              jsonFile={jsonFile}
              onFileChange={handleJsonFileChange}
            />
          )}

          <div className="mt-6">
            <ImportModeSelector
              importMode={importMode}
              onChange={setImportMode}
            />
          </div>

          <div className="mt-4">
            <StatusMessage error={error} success={success} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button onClick={handleClose} className={BUTTON_STYLES.ghost}>
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={
              loading || 
              (mode === 'feishu' && !feishuUrl) || 
              (mode === 'json' && !jsonData) ||
              (mode === 'csv' && !csvFile && !csvText)
            }
            className={BUTTON_STYLES.primary}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                导入中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                开始导入
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

