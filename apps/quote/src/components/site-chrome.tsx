import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { getMarketingMessages } from '@/lib/marketing-i18n';
import { MaksterQuoteLogo } from './brand-logo';
import { MarketingLocaleSwitcher } from './marketing-locale-switcher';
import styles from './site-chrome.module.css';

export function SiteHeader({ locale }: { locale: Locale }) {
  const { nav } = getMarketingMessages(locale);
  return <header className={styles.header}>
    <Link href={`/${locale}`} className={styles.brand} aria-label={nav.homeAria}><MaksterQuoteLogo /></Link>
    <nav className={styles.nav} aria-label={nav.aria}>
      <a href="#workflow">{nav.program}</a>
      <a href="#pricing">{nav.pricing}</a>
      <a href="#faq">{nav.faq}</a>
    </nav>
    <div className={styles.actions}>
      <MarketingLocaleSwitcher locale={locale} label={nav.language} />
      <Link href="/login" className={styles.login}>{nav.login}</Link>
      <Link href="/login" className={styles.try}>{nav.openQuote}</Link>
    </div>
    <details className={styles.menu}>
      <summary>{nav.menu}</summary>
      <div><MarketingLocaleSwitcher locale={locale} label={nav.language} /><a href="#workflow">{nav.program}</a><a href="#pricing">{nav.pricing}</a><a href="#faq">{nav.faq}</a><Link href="/login">{nav.openQuote}</Link></div>
    </details>
  </header>;
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const { nav } = getMarketingMessages(locale);
  return <footer className={styles.footer}>
    <MaksterQuoteLogo />
    <p>{nav.footer}</p>
    <nav><a href="#workflow">{nav.program}</a><a href="#pricing">{nav.pricing}</a><Link href="/login">{nav.login}</Link></nav>
  </footer>;
}
