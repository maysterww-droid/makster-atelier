import styles from './luxury-visual.module.css';

export function LuxuryVisual() {
  return (
    <section className={styles.visualSection} aria-label="Реальный мебельный контекст Makster Quote">
      <div className={styles.visualHead}>
        <span>FROM QUOTE TO REAL FURNITURE</span>
        <h2>Расчёт должен закончиться реальным проектом.</h2>
      </div>

      <div className={styles.gallery}>
        <article className={`${styles.frame} ${styles.kitchenHero}`}>
          <div className={styles.photoShade}/>
          <div className={styles.photoLabel}><span>01 / REAL PROJECT</span><b>Kitchen Praha</b></div>
          <div className={styles.quoteGlass}>
            <small>MAKSTER QUOTE · MQ-0082</small>
            <strong>196 900 Kč</strong>
            <div><span>True Cost</span><b>128 460 Kč</b></div>
            <div><span>Margin</span><b>34.8%</b></div>
          </div>
        </article>

        <article className={`${styles.frame} ${styles.workshop}`}>
          <div className={styles.photoShade}/>
          <div className={styles.photoLabel}><span>02 / NEXT STEP</span><b>Makster Pro → Production</b></div>
          <div className={styles.productionTag}>Quote → Pro → мастерская</div>
        </article>
      </div>
    </section>
  );
}
