import type { Metadata } from 'next';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getMarketingOrigin } from '@/lib/marketing-seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(getMarketingOrigin()),
  title: {
    default: 'Makster Quote — Furniture Pricing OS',
    template: '%s · Makster Quote',
  },
  description: 'Furniture construction, true cost, margin and customer proposals in one system.',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getInterfaceLocale();
  return <html lang={locale}><body>{children}</body></html>;
}
