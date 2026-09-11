import type { NextConfig } from 'next';

const isCloudflarePages = process.env.CF_PAGES === '1';

const nextConfig: NextConfig = isCloudflarePages
  ? {
      output: 'export',
      trailingSlash: true,
      images: {
        unoptimized: true,
      },
    }
  : {};

export default nextConfig;
