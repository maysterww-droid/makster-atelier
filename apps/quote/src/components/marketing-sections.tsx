import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { getMarketingMessages } from '@/lib/marketing-i18n';
import { MaksterQuoteLogo } from './brand-logo';
import styles from '@/app/marketing.module.css';

export function MarketingHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brandLink} aria-label="Makster Quote — главная">
        <MaksterQuoteLogo />
      </Link>
      <nav className={styles.nav} aria-label="Основная навигация">
        <a href="#workflow">Программа</a>
        <a href="#pricing">Тарифы</a>
        <a href="#faq">FAQ</a>
      </nav>
      <div className={styles.headerActions}>
        <Link href="/login" className={styles.ghostButton}>Войти</Link>
        <Link href="/login" className={styles.primaryButton}>Попробовать</Link>
      </div>
      <details className={styles.mobileMenu}>
        <summary aria-label="Открыть меню">Меню</summary>
        <div><a href="#workflow">Программа</a><a href="#pricing">Тарифы</a><a href="#faq">FAQ</a><Link href="/login">Войти в Quote</Link></div>
      </details>
    </header>
  );
}

export function FAQSection({ locale }: { locale: Locale }) {
  const { faq } = getMarketingMessages(locale);
  return (
    <section id="faq" className={styles.section}>
      <div className={styles.faqLayout}>
        <div className={styles.sectionHead}>
          <span className={styles.eyebrow}>FAQ</span>
          <h2>{faq.title}</h2>
        </div>
        <div className={styles.faqList}>
          {faq.items.map(({ question, answer }) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}
        </div>
      </div>
    </section>
  );
}

export function FinalCTA({ locale }: { locale: Locale }) {
  const { final } = getMarketingMessages(locale);
  return (
    <section id="final-cta" className={styles.finalCta}>
      <div>
        <span className={styles.eyebrow}>MAKSTER QUOTE</span>
        <h2>{final.title}</h2>
        <p>{final.body}</p>
      </div>
      <Link href="/login" className={styles.lightButton}>{final.cta} <span>→</span></Link>
    </section>
  );
}

export function MarketingFooter() {
  return (
    <footer className={styles.footer}>
      <MaksterQuoteLogo />
      <p>Makster Quote · часть экосистемы Makster Atelier</p>
      <div><a href="#workflow">Программа</a><a href="#pricing">Тарифы</a><Link href="/login">Войти</Link></div>
    </footer>
  );
}
