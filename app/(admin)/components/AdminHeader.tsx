/**
 * AdminHeader Component
 * Header for admin page with navigation and actions
 */

'use client';

import { Plus, Home, Download, Sparkles, LogOut, Tags, HardDrive, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BUTTON_STYLES, CONTAINER_STYLES } from '@/lib/styles';

interface AdminHeaderProps {
  onImport: () => void;
  onCreate: () => void;
}

export default function AdminHeader({ onImport, onCreate }: AdminHeaderProps) {
  const router = useRouter();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleBackup = async () => {
    if (isBackingUp) return;
    
    setIsBackingUp(true);
    setBackupMessage(null);
    
    try {
      const response = await fetch('/api/backup', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setBackupMessage({
          type: 'success',
          text: `备份成功! ${data.backup.statistics.prompts} 条提示词已保存`,
        });
        // 3秒后清除消息
        setTimeout(() => setBackupMessage(null), 3000);
      } else {
        setBackupMessage({
          type: 'error',
          text: data.error || '备份失败',
        });
      }
    } catch (error) {
      setBackupMessage({
        type: 'error',
        text: '备份请求失败',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

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
            <Link href="/admin-migrate" className={BUTTON_STYLES.ghost} title="标签迁移">
              <Tags className="w-4 h-4" />
              <span className="hidden sm:inline">标签迁移</span>
            </Link>
            <button onClick={onImport} className={BUTTON_STYLES.secondary}>
              <Download className="w-4 h-4" />
              <span>导入数据</span>
            </button>
            <button 
              onClick={handleBackup} 
              disabled={isBackingUp}
              className={BUTTON_STYLES.success}
              title="备份数据到云端"
            >
              {isBackingUp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <HardDrive className="w-4 h-4" />
              )}
              <span>{isBackingUp ? '备份中...' : '备份数据'}</span>
            </button>
            <button onClick={onCreate} className={BUTTON_STYLES.primary}>
              <Plus className="w-4 h-4" />
              <span>新建提示词</span>
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <button onClick={handleLogout} className={BUTTON_STYLES.ghost} title="退出登录">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">退出</span>
            </button>
          </div>
        </div>
        
        {/* 备份状态提示 */}
        {backupMessage && (
          <div className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
            backupMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {backupMessage.text}
          </div>
        )}
      </div>
    </header>
  );
}

