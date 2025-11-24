/**
 * ImportTabs Component
 * Tabs for selecting import mode
 */

import { LinkIcon, FileJson, FileSpreadsheet } from 'lucide-react';
import { ImportSourceType } from '@/types';

interface ImportTabsProps {
  mode: ImportSourceType;
  onChange: (mode: ImportSourceType) => void;
}

export default function ImportTabs({ mode, onChange }: ImportTabsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onChange('csv')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          mode === 'csv'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <FileSpreadsheet className="w-4 h-4" />
        CSV 文件
      </button>
      <button
        onClick={() => onChange('feishu')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          mode === 'feishu'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <LinkIcon className="w-4 h-4" />
        飞书文档
      </button>
      <button
        onClick={() => onChange('json')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          mode === 'json'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <FileJson className="w-4 h-4" />
        JSON 数据
      </button>
    </div>
  );
}

