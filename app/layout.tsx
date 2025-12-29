import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/shared/ToastContainer';
import { QueryProvider } from '@/lib/query-client';
import { Analytics } from '@vercel/analytics/next';

const siteUrl = 'https://www.topai.ink';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'AI 提示词库 - 全球精选 10000+ AI 绘画、视频、音频提示词大全',
    template: '%s | AI 提示词库',
  },
  description: '汇集全球优质 AI 提示词（Prompts），涵盖 Midjourney、Stable Diffusion、DALL-E、Runway、Sora 等主流模型的绘画、视频、音频生成案例，助您释放创意潜能。',
  keywords: [
    'AI提示词', 'AI Prompts', 'Midjourney提示词', 'Stable Diffusion提示词',
    'DALL-E提示词', 'AI绘画', 'AI艺术', 'AI视频生成', 'Runway提示词',
    'Sora提示词', 'AI音乐', 'Suno提示词', 'AI创作', 'Prompt工程',
    '文生图', '文生视频', '图像生成', '人工智能艺术',
  ],
  authors: [{ name: 'AI提示词库' }],
  creator: 'AI提示词库',
  publisher: 'AI提示词库',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      'zh-CN': `${siteUrl}/zh`,
      'en-US': `${siteUrl}/en`,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'AI 提示词库',
    title: 'AI 提示词库 - 全球精选 10000+ AI 提示词大全',
    description: '汇集全球优质 AI 提示词，涵盖 Midjourney、Stable Diffusion、DALL-E、Runway、Sora 等主流模型，助您释放创意潜能。',
    url: siteUrl,
    locale: 'zh_CN',
    images: [
      {
        url: `${siteUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'AI 提示词库 - 发现无限创意可能',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 提示词库 - 全球精选 10000+ AI 提示词',
    description: '汇集全球优质 AI 提示词，涵盖 Midjourney、Stable Diffusion 等主流模型',
    images: [`${siteUrl}/twitter-image`],
  },
  verification: {
    // 可以添加站长工具验证码
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
  category: 'technology',
};

// 获取 R2 CDN 域名用于预连接
const r2CdnUrl = process.env.NEXT_PUBLIC_R2_CDN_URL || '';
const r2CdnHost = r2CdnUrl ? new URL(r2CdnUrl).origin : '';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 预连接到图片 CDN，加速首屏图片加载 */}
        {r2CdnHost && (
          <>
            <link rel="preconnect" href={r2CdnHost} />
            <link rel="dns-prefetch" href={r2CdnHost} />
          </>
        )}
        {/* 预连接到常用外部图片源 */}
        <link rel="preconnect" href="https://cdn.nlark.com" />
        <link rel="dns-prefetch" href="https://cdn.nlark.com" />
      </head>
      <body>
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
        <Analytics debug={true} />
      </body>
    </html>
  );
}
