'use client';

import { X, Upload, XCircle } from 'lucide-react';
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
    batchProgress,
    cancelBatchImport,
    fastMode,
    setFastMode,
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

          {/* 快速模式开关 */}
          <div className="mt-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <input
              type="checkbox"
              id="fastMode"
              checked={fastMode}
              onChange={(e) => setFastMode(e.target.checked)}
              className="mt-1 w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            />
            <div>
              <label htmlFor="fastMode" className="text-sm font-medium text-amber-800 cursor-pointer">
                ⚡ 快速模式（推荐大数据量使用）
              </label>
              <p className="text-xs text-amber-700 mt-0.5">
                只检查来源URL是否重复，没有来源的数据直接导入。跳过标题、图片、相似度检查，速度极快。
              </p>
            </div>
          </div>

          <div className="mt-4">
            <StatusMessage error={error} success={success} />
          </div>

          {/* 分批导入进度条 */}
          {batchProgress.total > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">
                  分批导入进度
                </span>
                <span className="text-sm text-blue-600">
                  {batchProgress.current} / {batchProgress.total} 批次
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-700">
                <span className="text-green-600">✓ 成功: {batchProgress.successCount} 条</span>
                {batchProgress.skippedCount > 0 && (
                  <span className="text-amber-600">⏭ 跳过重复: {batchProgress.skippedCount} 条</span>
                )}
                {batchProgress.failedCount > 0 && (
                  <span className="text-red-600">✗ 失败: {batchProgress.failedCount} 条</span>
                )}
                {batchProgress.isRunning && (
                  <button
                    onClick={cancelBatchImport}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 ml-auto"
                  >
                    <XCircle className="w-3 h-3" />
                    取消导入
                  </button>
                )}
              </div>
              
              {/* 详细的重复原因统计 */}
              {batchProgress.duplicateStats && batchProgress.duplicateStats.total > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs font-medium text-amber-700 mb-1">跳过原因明细（数据库已有相同数据）:</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {batchProgress.duplicateStats.byEffect > 0 && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                        标题相同: {batchProgress.duplicateStats.byEffect}
                      </span>
                    )}
                    {batchProgress.duplicateStats.bySource > 0 && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                        来源相同: {batchProgress.duplicateStats.bySource}
                      </span>
                    )}
                    {batchProgress.duplicateStats.byImageUrl > 0 && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                        图片URL相同: {batchProgress.duplicateStats.byImageUrl}
                      </span>
                    )}
                    {batchProgress.duplicateStats.byPromptSimilarity > 0 && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                        提示词相似(&gt;90%): {batchProgress.duplicateStats.byPromptSimilarity}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button onClick={handleClose} className={BUTTON_STYLES.ghost} disabled={loading}>
            {loading ? '导入中...' : '取消'}
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
                {batchProgress.total > 0 ? `导入中 (${batchProgress.current}/${batchProgress.total})` : '导入中...'}
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

