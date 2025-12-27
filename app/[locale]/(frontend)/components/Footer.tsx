'use client';

import { AlertCircle } from 'lucide-react';
import OptimizedImage from './OptimizedImage';
import { useTranslations } from 'next-intl';

/**
 * Footer Component
 * 页面底部免责声明组件
 * Enhanced with modern styling
 */
export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-border/40 py-8 bg-background/50 backdrop-blur-sm">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* 左侧：免责声明与版权信息 */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{t('disclaimer')}</span>
            </div>
            
            <div className="max-w-xl space-y-2 text-muted-foreground text-sm leading-relaxed">
              <p>{t('disclaimerText1')}</p>
              <p>
                {t('disclaimerText2Part1')}
                <span className="text-primary font-medium">{t('noCommercial')}</span>
                {t('disclaimerText2Part2')}
              </p>
            </div>

            {/* 版权信息 */}
            <div className="pt-2 text-muted-foreground text-xs">
              <p>{t('copyright', { year: new Date().getFullYear() })}</p>
            </div>
          </div>

          {/* 右侧：公众号/联系方式 */}
          <div className="flex flex-col items-center md:items-end space-y-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('contact')}</span>
            <div className="relative w-64 h-24 rounded-xl overflow-hidden border border-border shadow-card group glass-card">
              <OptimizedImage 
                src="/api/images/static/contact.png" 
                alt={t('contactAlt')} 
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
