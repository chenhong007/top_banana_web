'use client';

import { AlertCircle } from 'lucide-react';

/**
 * Footer Component
 * 页面底部免责声明组件
 */
export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-dark-800/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 免责声明 */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-2 text-amber-400/80">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">免责声明</span>
          </div>
          
          <div className="max-w-3xl space-y-2 text-gray-400 text-sm leading-relaxed">
            <p>
              本站收集的提示词案例大部分来源于网络，仅供学习交流使用。
              所有案例均已尽可能注明原始出处，如有遗漏请联系补充。
            </p>
            <p>
              本站内容<span className="text-amber-400/90 font-medium">禁止用于任何商业用途</span>。
              如原作者认为侵犯了您的权益，请及时联系我们删除相关内容。
            </p>
          </div>

          {/* 版权信息 */}
          <div className="pt-4 text-gray-500 text-xs">
            <p>© {new Date().getFullYear()} AI 提示词库 · 仅供学习交流</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

