import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Makster Quote — Furniture Pricing OS',
    template: '%s · Makster Quote',
  },
  description: 'Расчёт корпусной мебели: конструкция, Price Book, реальная себестоимость, маржа и коммерческое предложение в одной системе.',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
