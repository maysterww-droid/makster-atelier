import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MarketingPageContent } from '@/app/marketing-page';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n';
import { getMarketingMetadata } from '@/lib/marketing-seo';

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) notFound();
  return getMarketingMetadata(locale as Locale);
}

export default async function LocalizedMarketingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) notFound();

  return <MarketingPageContent locale={locale as Locale} />;
}
