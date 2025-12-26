'use client';

import { AlertCircle } from 'lucide-react';
import OptimizedImage from './OptimizedImage';

/**
 * Footer Component
 * 页面底部免责声明组件
 */
export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-dark-800/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* 左侧：免责声明与版权信息 */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
            <div className="flex items-center gap-2 text-amber-400/80">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">免责声明</span>
            </div>
            
            <div className="max-w-xl space-y-2 text-gray-400 text-sm leading-relaxed">
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
            <div className="pt-2 text-gray-500 text-xs">
              <p>© {new Date().getFullYear()} AI 提示词库 · 仅供学习交流</p>
            </div>
          </div>

          {/* 右侧：公众号/联系方式 */}
          <div className="flex flex-col items-center md:items-end space-y-3">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">关注公众号 / 联系我</span>
            <div className="relative w-64 h-24 rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 group bg-dark-900/50">
              <OptimizedImage 
                src="/api/images/static/contact.png" 
                alt="联系方式" 
                fill 
                sizes="256px"
                objectFit="contain"
                className="transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

