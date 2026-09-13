import { t, type Locale } from '@/lib/i18n';
import { getMarketingMessages } from '@/lib/marketing-i18n';
import styles from './luxury-visual.module.css';

export function LuxuryVisual({ locale }: { locale: Locale }) {
  const { visual } = getMarketingMessages(locale);
  return (
    <section className={styles.visualSection} aria-label={visual.aria}>
      <div className={styles.visualHead}>
        <span>{visual.eyebrow}</span>
        <h2>{visual.title}</h2>
      </div>

      <div className={styles.gallery}>
        <article className={`${styles.frame} ${styles.kitchenHero}`}>
          <div className={styles.photoShade}/>
          <div className={styles.photoLabel}><span>01 / {visual.realProject}</span><b>Kitchen Praha</b></div>
          <div className={styles.quoteGlass}>
            <small>MAKSTER QUOTE · MQ-0082</small>
            <strong>196 900 Kč</strong>
            <div><span>{t(locale, 'trueCost')}</span><b>128 460 Kč</b></div>
            <div><span>{t(locale, 'margin')}</span><b>34.8%</b></div>
          </div>
        </article>

        <article className={`${styles.frame} ${styles.workshop}`}>
          <div className={styles.photoShade}/>
          <div className={styles.photoLabel}><span>02 / {visual.nextStep}</span><b>Makster Pro → {t(locale, 'production')}</b></div>
          <div className={styles.productionTag}>{visual.production}</div>
        </article>
      </div>
    </section>
  );
}
