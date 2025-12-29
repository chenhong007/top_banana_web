import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { locales, type Locale } from '@/i18n/config';

const siteUrl = 'https://www.topai.ink';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  
  if (!locales.includes(locale as Locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'metadata' });
  const keywords = await getTranslations({ locale, namespace: 'seoKeywords' });
  
  const localeUrl = `${siteUrl}/${locale}`;
  const ogLocale = locale === 'zh' ? 'zh_CN' : 'en_US';
 
  return {
    title: t('title'),
    description: t('description'),
    keywords: keywords.raw('list') as string[],
    alternates: {
      canonical: localeUrl,
      languages: {
        'zh-CN': `${siteUrl}/zh`,
        'en-US': `${siteUrl}/en`,
        'x-default': `${siteUrl}/zh`,
      },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      url: localeUrl,
      siteName: locale === 'zh' ? 'AI 提示词库' : 'AI Prompt Library',
      locale: ogLocale,
      alternateLocale: locale === 'zh' ? 'en_US' : 'zh_CN',
      images: [
        {
          url: `${siteUrl}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: locale === 'zh' ? 'AI 提示词库 - 发现无限创意可能' : 'AI Prompt Library - Discover Unlimited Creativity',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: [`${siteUrl}/twitter-image`],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client side
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
