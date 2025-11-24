/**
 * ImportModeSelector Component
 * Selector for import mode (merge/replace)
 */

import { DataImportMode } from '@/types';

interface ImportModeSelectorProps {
  importMode: DataImportMode;
  onChange: (mode: DataImportMode) => void;
}

export default function ImportModeSelector({ importMode, onChange }: ImportModeSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        导入模式
      </label>
      <div className="flex gap-4">
        <label className="flex items-center">
          <input
            type="radio"
            value="merge"
            checked={importMode === 'merge'}
            onChange={(e) => onChange(e.target.value as 'merge')}
            className="mr-2"
          />
          <span className="text-sm">合并（跳过重复）</span>
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            value="replace"
            checked={importMode === 'replace'}
            onChange={(e) => onChange(e.target.value as 'replace')}
            className="mr-2"
          />
          <span className="text-sm">替换（清空后导入）</span>
        </label>
      </div>
    </div>
  );
}

