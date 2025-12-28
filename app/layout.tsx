import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/shared/ToastContainer';
import { QueryProvider } from '@/lib/query-client';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI 提示词库',
  description: '优质 AI 提示词收集与管理平台',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
  openGraph: {
    title: 'AI 提示词库',
    description: '优质 AI 提示词收集与管理平台',
    type: 'website',
  },
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
      <body className={inter.className}>
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
        <Analytics debug={true} />
      </body>
    </html>
  );
}
