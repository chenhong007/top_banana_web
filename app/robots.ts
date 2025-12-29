import { MetadataRoute } from 'next';

const baseUrl = 'https://www.topai.ink';

/**
 * robots.txt 配置
 * 优化搜索引擎爬虫的抓取规则
 */
export default function robots(): MetadataRoute.Robots {
  // 共享的禁止路径
  const commonDisallow = ['/admin/', '/admin', '/api/', '/login', '/login/', '/_next/'];
  
  return {
    rules: [
      {
        // 搜索引擎爬虫通用规则
        userAgent: '*',
        allow: '/',
        disallow: commonDisallow,
      },
      {
        // Google 专用规则
        userAgent: 'Googlebot',
        allow: '/',
        disallow: commonDisallow,
      },
      {
        // Google 图片爬虫 - 允许抓取图片
        userAgent: 'Googlebot-Image',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      {
        // Bing 爬虫
        userAgent: 'Bingbot',
        allow: '/',
        disallow: commonDisallow,
      },
      {
        // 百度爬虫
        userAgent: 'Baiduspider',
        allow: '/',
        disallow: commonDisallow,
      },
      {
        // AI 爬虫 - GPTBot
        userAgent: 'GPTBot',
        allow: '/',
        disallow: commonDisallow,
      },
      {
        // AI 爬虫 - ChatGPT
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: commonDisallow,
      },
      {
        // AI 爬虫 - Claude
        userAgent: 'Claude-Web',
        allow: '/',
        disallow: commonDisallow,
      },
      {
        // AI 爬虫 - Anthropic
        userAgent: 'Anthropic-AI',
        allow: '/',
        disallow: commonDisallow,
      },
      {
        // Google AI 扩展
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: commonDisallow,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
