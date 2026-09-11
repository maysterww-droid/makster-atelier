import type { Metadata } from 'next';
import '../apps/quote/src/app/globals.css';

export const metadata: Metadata = {
  title: 'Makster Quote — Furniture Pricing OS',
  description: 'Расчёт корпусной мебели: конструкция, Price Book, реальная себестоимость, маржа и коммерческое предложение в одной системе.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
