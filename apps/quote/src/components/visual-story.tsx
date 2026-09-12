import { MaksterQuoteLogo } from './brand-logo';
import styles from './visual-story.module.css';

export function VisualStory() {
  return (
    <section className={styles.story} aria-label="Makster Quote в действии">
      <header className={styles.head}>
        <span>НЕ ЧИТАТЬ. СМОТРЕТЬ.</span>
        <h2>Проект превращается<br/><em>в цену.</em></h2>
      </header>

      <div className={styles.sceneBlueprint}>
        <div className={styles.sceneLabel}><span>01</span><b>КОНСТРУКЦИЯ</b></div>
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
            <span>EGGER U702</span><span>BLUM LEGRABOX</span><span>18 mm</span><span>8 модулей</span>
          </div>
        </div>
      </div>

      <div className={styles.flowArrow}><span>↓</span></div>

      <div className={styles.sceneMoney}>
        <div className={styles.sceneLabel}><span>02</span><b>TRUE COST</b></div>
        <div className={styles.moneyBoard}>
          <div className={styles.costBars}>
            <div style={{'--w':'100%'} as React.CSSProperties}><span>Материалы</span><b>66 340</b><i/></div>
            <div style={{'--w':'62%'} as React.CSSProperties}><span>Фурнитура</span><b>31 520</b><i/></div>
            <div style={{'--w':'44%'} as React.CSSProperties}><span>Работа</span><b>21 600</b><i/></div>
            <div style={{'--w':'20%'} as React.CSSProperties}><span>Накладные</span><b>9 000</b><i/></div>
          </div>
          <div className={styles.costTotal}>
            <small>СЕБЕСТОИМОСТЬ</small><strong>128 460 Kč</strong>
            <div className={styles.marginRing}><span>34.8%</span><small>маржа</small></div>
          </div>
        </div>
      </div>

      <div className={styles.flowArrow}><span>↓</span></div>

      <div className={styles.sceneOutput}>
        <div className={styles.sceneLabel}><span>03</span><b>КЛИЕНТУ</b></div>
        <div className={styles.outputBoard}>
          <div className={styles.document}>
            <div className={styles.docTop}><MaksterQuoteLogo compact /><small>MQ-0082</small></div>
            <div className={styles.docKitchen}><i/><i/><i/><i/><div/></div>
            <small>KITCHEN PRAHA</small><strong>196 900 Kč</strong><div className={styles.docLine}/><p>Предложение клиенту</p>
          </div>
          <div className={styles.ready}><span>PDF</span><b>ГОТОВ ✓</b><small>Отправить клиенту →</small></div>
        </div>
      </div>
    </section>
  );
}
