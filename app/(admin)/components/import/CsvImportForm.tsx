/**
 * CsvImportForm Component
 * Form for CSV file import
 */

import { FileSpreadsheet } from 'lucide-react';
import { useRef } from 'react';
import { FILE_UPLOAD, UI_TEXT } from '@/lib/constants';
import { INPUT_STYLES, LABEL_STYLES, ALERT_STYLES } from '@/lib/styles';

interface CsvImportFormProps {
  csvFile: File | null;
  csvText: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTextChange: (text: string) => void;
}

export default function CsvImportForm({ 
  csvFile, 
  csvText, 
  onFileChange, 
  onTextChange 
}: CsvImportFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <div>
        <label className={`${LABEL_STYLES.base} mb-2`}>
          上传 CSV 文件
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_UPLOAD.CSV_ACCEPT}
          onChange={onFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center gap-2"
        >
          <FileSpreadsheet className="w-12 h-12 text-gray-400" />
          <span className="text-gray-600">
            {csvFile ? csvFile.name : '点击选择 CSV 文件'}
          </span>
          <span className="text-xs text-gray-500">
            支持 .csv 和 .txt 格式
          </span>
        </button>
      </div>

      {csvText && (
        <div>
          <label className={`${LABEL_STYLES.base} mb-2`}>
            文件预览
          </label>
          <textarea
            value={csvText}
            onChange={(e) => onTextChange(e.target.value)}
            className={`${INPUT_STYLES.mono} h-48`}
            placeholder={UI_TEXT.PLACEHOLDER.CSV}
          />
        </div>
      )}

      <div className={ALERT_STYLES.info}>
        <p className="text-sm text-blue-800">
          💡 <strong>CSV 格式要求：</strong>
        </p>
        <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc space-y-1">
          <li>第一行必须是标题行（字段名）</li>
          <li>必填字段：效果、描述、提示词、来源</li>
          <li>支持字段：评测对象（标签）、参考图、创建时间、更新时间</li>
          <li>使用逗号分隔，支持引号包裹内容</li>
        </ul>
      </div>
    </div>
  );
}

