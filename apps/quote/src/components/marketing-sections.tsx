import Link from 'next/link';
import { MaksterQuoteLogo } from './brand-logo';
import styles from '@/app/marketing.module.css';

const faqs = [
  ['Makster Quote — это замена Excel?', 'Да, но не просто более красивый Excel. Quote строит расчёт вокруг реальной мебельной конструкции, Price Book и себестоимости, чтобы коммерческая часть не жила отдельно от проекта.'],
  ['Нужно ли сразу заполнять весь прайс-лист?', 'Нет. Можно начать с основных материалов и фурнитуры. Если цены нет, Makster показывает это явно, а не подставляет вымышленную стоимость.'],
  ['Можно ли использовать Quote без Makster Pro?', 'Да. Quote проектируется как самостоятельный облачный продукт. При этом структура данных сразу готовится к связке с Makster Pro.'],
  ['Будет ли мобильная версия?', 'Да. Публичный сайт и ключевые сценарии Quote проектируются адаптивно. Полноценное инженерное редактирование удобнее на большом экране, но просмотр проектов и быстрые действия должны работать и на телефоне.'],
  ['Какие языки планируются?', 'Launch Pack: English как fallback, русский, чешский, немецкий и польский.'],
];

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

export function FAQSection() {
  return (
    <section id="faq" className={styles.section}>
      <div className={styles.faqLayout}>
        <div className={styles.sectionHead}>
          <span className={styles.eyebrow}>FAQ</span>
          <h2>Вопросы до первого расчёта.</h2>
        </div>
        <div className={styles.faqList}>
          {faqs.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section id="final-cta" className={styles.finalCta}>
      <div>
        <span className={styles.eyebrow}>MAKSTER QUOTE</span>
        <h2>Следующая смета должна занимать меньше времени — и оставлять больше маржи.</h2>
        <p>Запустите пилот на реальном проекте и настройте Quote под собственную мастерскую.</p>
      </div>
      <Link href="/login" className={styles.lightButton}>Открыть Makster Quote <span>→</span></Link>
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
