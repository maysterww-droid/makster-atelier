import Link from 'next/link';
import { MaksterQuoteLogo } from './brand-logo';
import styles from './site-chrome.module.css';

export function SiteHeader() {
  return <header className={styles.header}>
    <Link href="/" className={styles.brand}><MaksterQuoteLogo /></Link>
    <nav className={styles.nav} aria-label="Основная навигация">
      <a href="#workflow">Программа</a>
      <a href="#pricing">Тарифы</a>
      <a href="#faq">FAQ</a>
    </nav>
    <div className={styles.actions}>
      <Link href="/login" className={styles.login}>Войти</Link>
      <Link href="/login" className={styles.try}>Открыть Quote</Link>
    </div>
    <details className={styles.menu}>
      <summary>Меню</summary>
      <div><a href="#workflow">Программа</a><a href="#pricing">Тарифы</a><a href="#faq">FAQ</a><Link href="/login">Открыть Quote</Link></div>
    </details>
  </header>;
}

export function SiteFooter() {
  return <footer className={styles.footer}>
    <MaksterQuoteLogo />
    <p>Furniture Pricing OS · часть экосистемы Makster Atelier</p>
    <nav><a href="#workflow">Программа</a><a href="#pricing">Тарифы</a><Link href="/login">Войти</Link></nav>
  </footer>;
}
