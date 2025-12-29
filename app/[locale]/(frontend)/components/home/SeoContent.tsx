'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Globe } from 'lucide-react';

export default function SeoContent() {
  const t = useTranslations('seo');
  const locale = useLocale();
  const alternateLocale = locale === 'zh' ? 'en' : 'zh';
  const alternateLocaleName = locale === 'zh' ? 'English Version' : '中文版本';

  return (
    <section className="container py-12 text-muted-foreground">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t('aboutTitle')}
          </h2>
          <div className="space-y-4 leading-relaxed">
            <p>{t('aboutText1')}</p>
            <p>{t('aboutText2')}</p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">
              {t('categoriesTitle')}
            </h3>
            <p className="leading-relaxed">
              {t('categoriesText')}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">
              {t('usageTitle')}
            </h3>
            <p className="leading-relaxed">
              {t('usageText')}
            </p>
          </div>
        </div>

        {/* 多语言链接 - SEO 友好的内链 */}
        <div className="flex justify-center pt-4">
          <Link 
            href={`/${alternateLocale}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-primary border border-border/50 hover:border-primary/30 rounded-lg transition-colors"
            hrefLang={alternateLocale === 'zh' ? 'zh-CN' : 'en-US'}
          >
            <Globe className="h-4 w-4" />
            <span>{alternateLocaleName}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
