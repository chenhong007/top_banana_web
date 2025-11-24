/**
 * FeishuImportForm Component
 * Form for Feishu document import
 */

import { UI_TEXT } from '@/lib/constants';
import { INPUT_STYLES, LABEL_STYLES, ALERT_STYLES } from '@/lib/styles';

interface FeishuImportFormProps {
  feishuUrl: string;
  cookie: string;
  onUrlChange: (url: string) => void;
  onCookieChange: (cookie: string) => void;
}

export default function FeishuImportForm({ 
  feishuUrl, 
  cookie, 
  onUrlChange, 
  onCookieChange 
}: FeishuImportFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className={`${LABEL_STYLES.base} mb-2`}>
          飞书文档链接
        </label>
        <input
          type="text"
          value={feishuUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          className={INPUT_STYLES.base}
          placeholder={UI_TEXT.PLACEHOLDER.FEISHU_URL}
        />
      </div>

      <div>
        <label className={`${LABEL_STYLES.base} mb-2`}>
          Cookie（如果文档需要登录）
          <span className="text-gray-500 text-xs ml-2">可选</span>
        </label>
        <textarea
          value={cookie}
          onChange={(e) => onCookieChange(e.target.value)}
          className={`${INPUT_STYLES.mono} h-20`}
          placeholder={UI_TEXT.PLACEHOLDER.COOKIE}
        />
      </div>

      <div className={ALERT_STYLES.info}>
        <p className="text-sm text-blue-800">
          💡 <strong>提示：</strong>如果文档需要登录，请：
        </p>
        <ol className="text-sm text-blue-700 mt-2 ml-4 list-decimal space-y-1">
          <li>在浏览器中打开飞书文档并登录</li>
          <li>按 F12 打开开发者工具</li>
          <li>在 Application/Storage → Cookies 中复制 Cookie</li>
          <li>粘贴到上方输入框</li>
        </ol>
      </div>
    </div>
  );
}

