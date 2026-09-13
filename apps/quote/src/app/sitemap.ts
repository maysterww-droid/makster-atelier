import type { MetadataRoute } from 'next';
import { SUPPORTED_LOCALES } from '@/lib/i18n';
import { getMarketingOrigin } from '@/lib/marketing-seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getMarketingOrigin();
  const localized = SUPPORTED_LOCALES.map((locale) => ({
    url: `${origin}/${locale}`,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  return [
    { url: origin, changeFrequency: 'weekly', priority: 1 },
    ...localized,
  ];
}
