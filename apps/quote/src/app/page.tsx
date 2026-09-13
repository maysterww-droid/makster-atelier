import type { Metadata } from 'next';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getMarketingMetadata } from '@/lib/marketing-seo';
import { MarketingPageContent } from './marketing-page';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getInterfaceLocale();
  return getMarketingMetadata(locale, '/');
}

export default async function MarketingPage() {
  const locale = await getInterfaceLocale();
  return <MarketingPageContent locale={locale} canonicalPath="/" />;
}
