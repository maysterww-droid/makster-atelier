import { t, type Locale } from '@/lib/i18n';
import { getMarketingMessages } from '@/lib/marketing-i18n';
import { MaksterQuoteLogo } from './brand-logo';
import styles from './visual-story.module.css';

export function VisualStory({ locale }: { locale: Locale }) {
  const { story } = getMarketingMessages(locale);
  return (
    <section className={styles.story} aria-label={story.aria}>
      <header className={styles.head}>
        <span>{story.eyebrow}</span>
        <h2>{story.title}<br/><em>{story.emphasis}</em></h2>
      </header>

      <div className={styles.sceneBlueprint}>
        <div className={styles.sceneLabel}><span>01</span><b>{story.construction}</b></div>
        <div className={styles.blueprint}>
          <div className={styles.dimensionTop}><span>3 640 mm</span></div>
          <div className={styles.cabinets}>
            <i className={styles.tall}/>
            <i className={styles.base}/>
            <i className={styles.drawer}/>
            <i className={styles.base}/>
            <i className={styles.base}/>
            <div className={styles.worktop}/>
          </div>
          <div className={styles.tags}>
            <span>EGGER U702</span><span>BLUM LEGRABOX</span><span>18 mm</span><span>{story.modules}</span>
          </div>
        </div>
      </div>

      <div className={styles.flowArrow}><span>↓</span></div>

      <div className={styles.sceneMoney}>
        <div className={styles.sceneLabel}><span>02</span><b>TRUE COST</b></div>
        <div className={styles.moneyBoard}>
          <div className={styles.costBars}>
            <div style={{'--w':'100%'} as React.CSSProperties}><span>{t(locale, 'materials')}</span><b>66 340</b><i/></div>
            <div style={{'--w':'62%'} as React.CSSProperties}><span>{t(locale, 'hardware')}</span><b>31 520</b><i/></div>
            <div style={{'--w':'44%'} as React.CSSProperties}><span>{t(locale, 'labour')}</span><b>21 600</b><i/></div>
            <div style={{'--w':'20%'} as React.CSSProperties}><span>{t(locale, 'overhead')}</span><b>9 000</b><i/></div>
          </div>
          <div className={styles.costTotal}>
            <small>{story.cost}</small><strong>128 460 Kč</strong>
            <div className={styles.marginRing}><span>34.8%</span><small>{story.margin}</small></div>
          </div>
        </div>
      </div>

      <div className={styles.flowArrow}><span>↓</span></div>

      <div className={styles.sceneOutput}>
        <div className={styles.sceneLabel}><span>03</span><b>{story.client}</b></div>
        <div className={styles.outputBoard}>
          <div className={styles.document}>
            <div className={styles.docTop}><MaksterQuoteLogo compact /><small>MQ-0082</small></div>
            <div className={styles.docKitchen}><i/><i/><i/><i/><div/></div>
            <small>KITCHEN PRAHA</small><strong>196 900 Kč</strong><div className={styles.docLine}/><p>{story.proposal}</p>
          </div>
          <div className={styles.ready}><span>PDF</span><b>{story.ready}</b><small>{story.send}</small></div>
        </div>
      </div>
    </section>
  );
}
