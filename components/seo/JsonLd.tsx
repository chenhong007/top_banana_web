/**
 * JSON-LD 结构化数据组件
 * 用于提升搜索引擎对网站内容的理解
 */

const siteUrl = 'https://www.topai.ink';

interface JsonLdProps {
  locale: 'zh' | 'en';
}

/**
 * 网站结构化数据
 */
export function WebsiteJsonLd({ locale }: JsonLdProps) {
  const siteName = locale === 'zh' ? 'AI 提示词库' : 'AI Prompt Library';
  const description = locale === 'zh' 
    ? '汇集全球优质 AI 提示词，涵盖 Midjourney、Stable Diffusion、DALL-E、Runway、Sora 等主流模型。'
    : 'Curated collection of top AI prompts covering Midjourney, Stable Diffusion, DALL-E, Runway, Sora and more.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: siteName,
    description,
    url: siteUrl,
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/${locale}?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * 组织结构化数据
 */
export function OrganizationJsonLd({ locale }: JsonLdProps) {
  const name = locale === 'zh' ? 'AI 提示词库' : 'AI Prompt Library';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name,
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/icon.svg`,
      width: 512,
      height: 512,
    },
    sameAs: [
      // 可以添加社交媒体链接
      // 'https://twitter.com/yourhandle',
      // 'https://github.com/yourhandle',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * 面包屑导航结构化数据
 */
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * 收藏合集（ItemList）结构化数据
 * 用于展示提示词列表
 */
interface CollectionItem {
  name: string;
  description?: string;
  image?: string;
  url?: string;
}

interface CollectionJsonLdProps {
  name: string;
  description: string;
  items: CollectionItem[];
  locale: 'zh' | 'en';
}

export function CollectionJsonLd({ name, description, items, locale }: CollectionJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${siteUrl}/${locale}/#collection`,
    name,
    description,
    url: `${siteUrl}/${locale}`,
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en-US',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.slice(0, 10).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'CreativeWork',
          name: item.name,
          description: item.description,
          ...(item.image && { image: item.image }),
          ...(item.url && { url: item.url }),
        },
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * FAQ 结构化数据（可选，用于 SEO 内容部分）
 */
interface FAQItem {
  question: string;
  answer: string;
}

interface FAQJsonLdProps {
  items: FAQItem[];
}

export function FAQJsonLd({ items }: FAQJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/**
 * 综合 SEO 结构化数据组件
 */
export default function SeoJsonLd({ locale }: JsonLdProps) {
  return (
    <>
      <WebsiteJsonLd locale={locale} />
      <OrganizationJsonLd locale={locale} />
    </>
  );
}
