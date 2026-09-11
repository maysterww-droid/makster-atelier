import styles from './luxury-visual.module.css';

export function LuxuryVisual() {
  return (
    <section className={styles.visualSection} aria-label="Makster furniture visual story">
      <div className={styles.visualHead}>
        <span>MAKSTER / REAL FURNITURE CONTEXT</span>
        <h2>Не таблица. Реальный проект, который можно почувствовать.</h2>
      </div>

      <div className={styles.gallery}>
        <article className={`${styles.frame} ${styles.kitchenHero}`}>
          <div className={styles.photoShade}/>
          <div className={styles.photoLabel}><span>01 / KITCHEN</span><b>Walnut · stone · brass</b></div>
          <div className={styles.quoteGlass}>
            <small>LIVE QUOTE · MQ-0082</small>
            <strong>196 900 Kč</strong>
            <div><span>True Cost</span><b>128 460 Kč</b></div>
            <div><span>Margin</span><b>34.8%</b></div>
          </div>
        </article>

        <article className={`${styles.frame} ${styles.wardrobe}`}>
          <div className={styles.photoShade}/>
          <div className={styles.photoLabel}><span>02 / VISUALIZER</span><b>Решение до производства</b></div>
        </article>

        <article className={`${styles.frame} ${styles.darkKitchen}`}>
          <div className={styles.photoShade}/>
          <div className={styles.photoLabel}><span>03 / MATERIAL</span><b>Свет, фактура, фурнитура</b></div>
          <div className={styles.materialChips}><i/><i/><i/><i/></div>
        </article>

        <article className={`${styles.frame} ${styles.workshop}`}>
          <div className={styles.photoShade}/>
          <div className={styles.photoLabel}><span>04 / PRODUCTION</span><b>Проект заканчивается в мастерской</b></div>
          <div className={styles.productionTag}>Makster Pro → Production</div>
        </article>
      </div>
    </section>
  );
}
