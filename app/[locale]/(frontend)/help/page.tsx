import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { locales, type Locale } from '@/i18n/config';
import HelpClient from './HelpClient';

const siteUrl = 'https://www.topai.ink';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'helpPage' });
  const localeUrl = `${siteUrl}/${locale}/help`;

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: localeUrl,
      languages: {
        'zh-CN': `${siteUrl}/zh/help`,
        'en-US': `${siteUrl}/en/help`,
        'x-default': `${siteUrl}/zh/help`,
      },
    },
    openGraph: {
      title: t('metaTitle'),
      description: t('metaDescription'),
      type: 'website',
      url: localeUrl,
      siteName: locale === 'zh' ? 'AI 提示词库' : 'AI Prompt Library',
    },
  };
}

export default async function HelpPage({ params }: Props) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  return <HelpClient />;
}
