/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Deployment mode: 'frontend' for static export, 'full' for complete app with admin
const deployMode = process.env.DEPLOY_MODE || 'full';

// Helper to safely get hostname from URL
const getHostname = (url) => {
  try {
    return new URL(url).hostname;
  } catch (e) {
    console.warn(`Warning: Invalid URL provided in environment variable: ${url}`);
    return null;
  }
};

const baseConfig = {
  reactStrictMode: true,
  images: {
    // 生产环境启用图片优化，开发环境可选禁用
    unoptimized: process.env.DISABLE_IMAGE_OPTIMIZATION === 'true',
    // 支持的设备尺寸
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // 支持的图片尺寸
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 图片格式优先级
    formats: ['image/avif', 'image/webp'],
    // 最小缓存 TTL
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 年
    remotePatterns: [
      // R2 公开访问域名
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      // 自定义 R2 CDN 域名（NEXT_PUBLIC_R2_CDN_URL，用于前端加速）
      ...(process.env.NEXT_PUBLIC_R2_CDN_URL && getHostname(process.env.NEXT_PUBLIC_R2_CDN_URL) ? [{
        protocol: 'https',
        hostname: getHostname(process.env.NEXT_PUBLIC_R2_CDN_URL),
      }] : []),
      // 自定义 CDN 域名（如果配置了 CLOUDFLARE_R2_PUBLIC_URL）
      ...(process.env.CLOUDFLARE_R2_PUBLIC_URL && getHostname(process.env.CLOUDFLARE_R2_PUBLIC_URL) ? [{
        protocol: 'https',
        hostname: getHostname(process.env.CLOUDFLARE_R2_PUBLIC_URL),
      }] : []),
      // 其他外部图片源
      {
        protocol: 'https',
        hostname: 'cdn.nlark.com',
      },
      {
        protocol: 'https',
        hostname: '**.qpic.cn',
      },
      {
        protocol: 'https',
        hostname: '**.zhimg.com',
      },
    ],
  },
};

// Frontend-only static export configuration
// 注意：静态导出必须禁用图片优化
const frontendConfig = {
  ...baseConfig,
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  trailingSlash: true,
  images: {
    ...baseConfig.images,
    unoptimized: true, // 静态导出必须禁用图片优化
  },
  env: {
    NEXT_PUBLIC_DEPLOY_ENV: 'frontend',
  },
};

// Full application configuration (with admin + API)
// Note: Don't use 'standalone' for Vercel deployment
const fullConfig = {
  ...baseConfig,
  env: {
    NEXT_PUBLIC_DEPLOY_ENV: 'full',
  },
  async headers() {
    return [
      {
        source: '/llms.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
        ],
      },
      {
        source: '/llms-full.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
        ],
      },
    ];
  },
};

const nextConfig = deployMode === 'frontend' ? frontendConfig : fullConfig;

console.log(`📦 Building in ${deployMode.toUpperCase()} mode`);

module.exports = withNextIntl(nextConfig);
