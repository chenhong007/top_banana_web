'use client';

import { AlertCircle, Globe, Sparkles, HelpCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import OptimizedImage from './OptimizedImage';
import { useTranslations } from 'next-intl';

/**
 * Footer Component
 * 页面底部免责声明组件
 * Enhanced with modern styling and SEO-friendly internal links
 */
export function Footer() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');
  const locale = useLocale();
  const alternateLocale = locale === 'zh' ? 'en' : 'zh';
  const alternateLocaleName = locale === 'zh' ? 'English' : '中文';

  return (
    <footer className="border-t border-border/40 py-8 bg-background/50 backdrop-blur-sm">
      <div className="container">
        {/* 顶部导航链接区 - SEO 友好的内链 */}
        <div className="flex flex-wrap justify-center gap-6 mb-8 pb-6 border-b border-border/30">
          {/* Logo 链接回首页 */}
          <Link 
            href={`/${locale}`}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">{locale === 'zh' ? 'AI 提示词库' : 'AI Prompt Library'}</span>
          </Link>
          
          {/* 分隔符 */}
          <span className="text-border hidden sm:inline">|</span>
          
          {/* 关于我们链接 */}
          <Link 
            href={`/${locale}/about`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
            <span>{nav('about')}</span>
          </Link>
          
          {/* 帮助中心链接 */}
          <Link 
            href={`/${locale}/help`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>{nav('help')}</span>
          </Link>
          
          {/* 分隔符 */}
          <span className="text-border hidden sm:inline">|</span>
          
          {/* 多语言链接 - 重要的内链 */}
          <Link 
            href={`/${alternateLocale}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
            hrefLang={alternateLocale === 'zh' ? 'zh-CN' : 'en-US'}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{alternateLocaleName}</span>
          </Link>
        </div>

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
