import { ReactNode } from 'react';

/**
 * Frontend Layout
 * 为所有前台页面提供统一的外壳，包括背景、页眉（如果适用）和页脚
 */
export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* 背景装饰 - 移至布局层以确保页面切换时保持一致 */}
      <div className="fixed inset-0 bg-gradient-to-b from-background via-background/95 to-background pointer-events-none z-0" />
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse-slow" />
      <div
        className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse-slow"
        style={{ animationDelay: '3s' }}
      />

      {/* 页面内容 */}
      <div className="relative z-10 flex-grow">
        {children}
      </div>
    </div>
  );
}

