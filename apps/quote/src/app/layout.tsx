import type { Metadata } from 'next';
import { getInterfaceLocale } from '@/lib/interface-locale';
import './globals.css';

export const metadata: Metadata = {
  title: 'Makster Quote',
  description: 'Furniture quotation and commercial costing for workshops.',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getInterfaceLocale();
  return <html lang={locale}><body>{children}</body></html>;
}
