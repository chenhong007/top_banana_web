/**
 * JsonImportForm Component
 * Form for JSON data import
 */

import { FileJson } from 'lucide-react';
import { useRef, useMemo } from 'react';
import { UI_TEXT } from '@/lib/constants';
import { INPUT_STYLES, LABEL_STYLES } from '@/lib/styles';

interface JsonImportFormProps {
  jsonData: string;
  onChange: (data: string) => void;
  jsonFile?: File | null;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function JsonImportForm({ 
  jsonData, 
  onChange, 
  jsonFile, 
  onFileChange 
}: JsonImportFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewImages = useMemo(() => {
    if (!jsonData) return [];
    try {
      const items = JSON.parse(jsonData);
      if (Array.isArray(items)) {
        return items
          .map(item => item.imageUrl || item.preview || item.image || item.图片)
          .filter(url => url && typeof url === 'string')
          .slice(0, 8); 
      }
    } catch (e) {
      return [];
    }
    return [];
  }, [jsonData]);

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
            accept=".json"
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

      <div>
        <label className={`${LABEL_STYLES.base} mb-2`}>
          JSON 数据
        </label>
        <textarea
          value={jsonData}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT_STYLES.mono} h-64`}
          placeholder={UI_TEXT.PLACEHOLDER.JSON}
        />
      </div>

      {previewImages.length > 0 && (
        <div>
          <label className={`${LABEL_STYLES.base} mb-2`}>
            图片预览 (前8张)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {previewImages.map((url, idx) => (
              <div key={idx} className="aspect-square relative rounded-md overflow-hidden border bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={url} 
                  alt={`Preview ${idx}`} 
                  className="object-cover w-full h-full" 
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              </div>
            ))}
          </div>
        </div>
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
