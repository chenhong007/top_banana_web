/**
 * AdminHeader Component
 * Header for admin page with navigation and actions
 */

import { Plus, Home, Download, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { BUTTON_STYLES, CONTAINER_STYLES } from '@/lib/styles';

interface AdminHeaderProps {
  onImport: () => void;
  onCreate: () => void;
}

export default function AdminHeader({ onImport, onCreate }: AdminHeaderProps) {
  return (
    <header className={CONTAINER_STYLES.header}>
      <div className={CONTAINER_STYLES.headerContent}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-600/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Prompt Manager</h1>
              <p className="text-xs text-gray-500 font-medium">提示词库管理系统</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/" className={BUTTON_STYLES.ghost}>
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">返回首页</span>
            </Link>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <button onClick={onImport} className={BUTTON_STYLES.secondary}>
              <Download className="w-4 h-4" />
              <span>导入数据</span>
            </button>
            <button onClick={onCreate} className={BUTTON_STYLES.primary}>
              <Plus className="w-4 h-4" />
              <span>新建提示词</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

