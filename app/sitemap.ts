import { MetadataRoute } from 'next';

const locales = ['zh', 'en'] as const;
const baseUrl = 'https://www.topai.ink';

/**
 * 生成站点地图
 * 包含多语言支持和 hreflang 标记
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date();

  // 主页面路由 - 每个语言版本
  const homePages: MetadataRoute.Sitemap = locales.map((locale) => ({
    url: `${baseUrl}/${locale}`,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: 1.0,
    alternates: {
      languages: {
        'zh-CN': `${baseUrl}/zh`,
        'en-US': `${baseUrl}/en`,
        'x-default': `${baseUrl}/zh`,
      },
    },
  }));

  // 根路由 (重定向到默认语言)
  const rootRoute: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 1.0,
      alternates: {
        languages: {
          'zh-CN': `${baseUrl}/zh`,
          'en-US': `${baseUrl}/en`,
          'x-default': `${baseUrl}/zh`,
        },
      },
    },
  ];

  // 关于页面 - About pages
  const aboutPages: MetadataRoute.Sitemap = locales.map((locale) => ({
    url: `${baseUrl}/${locale}/about`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
    alternates: {
      languages: {
        'zh-CN': `${baseUrl}/zh/about`,
        'en-US': `${baseUrl}/en/about`,
        'x-default': `${baseUrl}/zh/about`,
      },
    },
  }));

  // 帮助页面 - Help pages
  const helpPages: MetadataRoute.Sitemap = locales.map((locale) => ({
    url: `${baseUrl}/${locale}/help`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
    alternates: {
      languages: {
        'zh-CN': `${baseUrl}/zh/help`,
        'en-US': `${baseUrl}/en/help`,
        'x-default': `${baseUrl}/zh/help`,
      },
    },
  }));

  return [...rootRoute, ...homePages, ...aboutPages, ...helpPages];
}
