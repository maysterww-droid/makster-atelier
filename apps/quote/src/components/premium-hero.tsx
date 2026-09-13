import Link from 'next/link';
import { t, type Locale } from '@/lib/i18n';
import { getMarketingMessages } from '@/lib/marketing-i18n';
import { MaksterQuoteLogo } from './brand-logo';
import styles from './premium-polish.module.css';

function QuoteCockpit({ locale }: { locale: Locale }) {
  const { demo, hero, visual } = getMarketingMessages(locale);
  return (
    <div className={styles.cockpit} aria-label={visual.aria}>
      <div className={styles.cockpitChrome}>
        <div className={styles.chromeDots}><i/><i/><i/></div>
        <span>Kitchen Praha · MQ-0082</span>
        <b>{t(locale, 'statusActive')}</b>
      </div>
      <div className={styles.cockpitBody}>
        <aside>
          <MaksterQuoteLogo compact variant="light" />
          <span className={styles.activeNav}>{hero.overview}</span>
          <span>{hero.structure}</span>
          <span>{t(locale, 'priceBook')}</span>
          <span>{hero.documents}</span>
        </aside>
        <div className={styles.workspace}>
          <div className={styles.workspaceHead}>
            <div><small>{t(locale, 'project').toUpperCase()} MQ-0082</small><strong>Kitchen Praha</strong></div>
            <button>PDF</button>
          </div>
          <div className={styles.metrics}>
            <article><span>{hero.cost}</span><b>128 460 Kč</b></article>
            <article><span>{t(locale, 'margin')}</span><b>34.8%</b></article>
            <article className={styles.clientMetric}><span>{hero.clientPrice}</span><b>196 900 Kč</b></article>
          </div>
          <div className={styles.projectGrid}>
            <div className={styles.modules}>
              <small>{demo.cabinets} · 8</small>
              <div><i/><span><b>Base 600</b><small>{hero.moduleDoors}</small></span><em>8 420</em></div>
              <div className={styles.activeModule}><i/><span><b>Drawer 800</b><small>{hero.moduleDrawers}</small></span><em>11 380</em></div>
              <div><i/><span><b>Tall Oven</b><small>{hero.moduleOven}</small></span><em>14 760</em></div>
            </div>
            <div className={styles.trueCost}>
              <small>{t(locale, 'trueCost')}</small>
              <p><span>{t(locale, 'materials')}</span><b>66 340</b></p>
              <p><span>{t(locale, 'hardware')}</span><b>31 520</b></p>
              <p><span>{t(locale, 'labour')}</span><b>21 600</b></p>
              <p><span>{t(locale, 'overhead')}</span><b>9 000</b></p>
              <strong>128 460 Kč</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PremiumHero({ locale }: { locale: Locale }) {
  const { hero } = getMarketingMessages(locale);
  return (
    <section className={`${styles.hero} mq-mobile-hero`}>
      <div className={styles.grain}/>
      <div className={styles.heroCopy}>
        <div className="mq-hero-brand" style={{ marginBottom: 24 }}><MaksterQuoteLogo /></div>
        <span className={styles.eyebrow}>{hero.eyebrow}</span>
        <h1>{hero.title}<em>{hero.emphasis}</em></h1>
        <p>{hero.body}</p>
        <div className={styles.actions}>
          <Link href="/login" className={styles.primary}>{hero.primary} <span>→</span></Link>
          <a href="#workflow" className={styles.secondary}>{hero.secondary}</a>
        </div>
      </div>
      <div className={styles.visualStage}>
        <div className="mq-software-tag">{hero.eyebrow}</div>
        <div className="mq-live-project"><span>{t(locale, 'statusActive')} · {t(locale, 'project')}</span><b>MQ-0082</b><em>{hero.modulesMargin}</em></div>
        <QuoteCockpit locale={locale} />
      </div>
    </section>
  );
}
