import type { MetadataRoute } from 'next';
import { getMarketingOrigin } from '@/lib/marketing-seo';

export default function robots(): MetadataRoute.Robots {
  const origin = getMarketingOrigin();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api',
        '/auth',
        '/login',
        '/dashboard',
        '/projects',
        '/quotes',
        '/clients',
        '/price-book',
        '/library',
        '/settings',
        '/q',
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
