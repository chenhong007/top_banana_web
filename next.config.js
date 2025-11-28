/** @type {import('next').NextConfig} */

// Deployment mode: 'frontend' for static export, 'full' for complete app with admin
const deployMode = process.env.DEPLOY_MODE || 'full';

const baseConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

// Frontend-only static export configuration
const frontendConfig = {
  ...baseConfig,
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_DEPLOY_ENV: 'frontend',
  },
};

// Full application configuration (with admin + API)
const fullConfig = {
  ...baseConfig,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_DEPLOY_ENV: 'full',
  },
};

const nextConfig = deployMode === 'frontend' ? frontendConfig : fullConfig;

console.log(`📦 Building in ${deployMode.toUpperCase()} mode`);

module.exports = nextConfig;
