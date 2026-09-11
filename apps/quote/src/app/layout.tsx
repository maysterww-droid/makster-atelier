import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Makster Quote',
  description: 'Расчёт корпусной мебели от конструкции до прибыльного предложения.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
