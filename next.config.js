/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  // Set basePath and trailingSlash for better static hosting compatibility
  basePath: '/top_banana_web',
  trailingSlash: true,
  // Allow importing images from external domains
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Environment variables for frontend-only deployment
  env: {
    NEXT_PUBLIC_DEPLOY_ENV: process.env.NEXT_PUBLIC_DEPLOY_ENV || 'frontend',
  },
}

module.exports = nextConfig
