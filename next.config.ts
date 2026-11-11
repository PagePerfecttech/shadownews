import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  images: {
    // SECURITY: Only allow whitelisted domains for image loading
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev', // Cloudflare R2 CDN
      },
      {
        protocol: 'https',
        hostname: 'm.shadownews.in',
      },
      {
        protocol: 'https',
        hostname: 'shadownews.in',
      },
    ],
  },
  headers: async () => [
    // SECURITY: Apply security headers to all responses
    {
      source: '/:path*',
      headers: [
        // Prevent MIME-type sniffing
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        // Prevent clickjacking
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        // Enable XSS protection
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        // Referrer policy
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        // Permissions policy
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        // HSTS
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        },
      ],
    },
    // SECURITY: API-specific headers for CORS
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Access-Control-Allow-Origin',
          value: process.env.NEXT_PUBLIC_APP_URL || 'https://m.shadownews.in',
        },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET,POST,PUT,DELETE,OPTIONS',
        },
        {
          key: 'Access-Control-Allow-Headers',
          value: 'Content-Type,Authorization,X-Requested-With',
        },
        {
          key: 'Access-Control-Allow-Credentials',
          value: 'true',
        },
        {
          key: 'Access-Control-Max-Age',
          value: '86400',
        },
      ],
    },
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  allowedDevOrigins: [
    '.space.chatglm.site',
    '.space-z.ai',
    'localhost',
  ],
};

export default nextConfig;
