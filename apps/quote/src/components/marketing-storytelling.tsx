import styles from './marketing-storytelling.module.css';

const painPoints = [
  ['01', 'Excel живёт отдельно', 'Конструкция меняется, а смета уже живёт своей жизнью.'],
  ['02', 'Цены тихо устаревают', 'Одна старая закупочная цена съедает маржу незаметно.'],
  ['03', 'Работа теряется', 'Монтаж, доставка и операции часто вспоминаются слишком поздно.'],
  ['04', 'PDF собирается вручную', 'Коммерческое предложение становится отдельной рутиной.'],
];

const materials = [
  ['Oak veneer', 'Тёплый дуб', styles.oak],
  ['Walnut', 'Орех', styles.walnut],
  ['Painted MDF', 'Warm white', styles.mdf],
  ['Stone decor', 'Travertine', styles.stone],
  ['Black hardware', 'Graphite', styles.graphite],
  ['Brass accent', 'Muted brass', styles.brass],
];

const ecosystem = [
  ['01', 'Quote', 'Цена и маржа', 'Себестоимость, Price Book и предложение клиенту.'],
  ['02', 'Visualizer', 'Решение с клиентом', 'Визуализация проекта до передачи в производство.'],
  ['03', 'Makster Pro', 'Инженерия', 'Деталировка, правила, фурнитура и производственная логика.'],
  ['04', 'Production', 'Исполнение', 'Закупка, производство, логистика и монтаж.'],
];

function WorkshopScene() {
  return (
    <div className={styles.scene} aria-label="Визуальная схема проекта кухни и живого расчёта">
      <div className={styles.sceneTopbar}>
        <span>Kitchen Praha · MQ-0082</span>
        <b>LIVE QUOTE</b>
      </div>
      <div className={styles.kitchenStage}>
        <div className={`${styles.panel} ${styles.tallPanel}`} />
        <div className={`${styles.panel} ${styles.basePanel}`} />
        <div className={`${styles.panel} ${styles.drawerPanel}`} />
        <div className={`${styles.panel} ${styles.sinkPanel}`} />
        <div className={styles.worktop} />
        <div className={styles.wallLine} />
        <div className={styles.dimension}><span>3 640 mm</span></div>
      </div>
      <div className={styles.liveCard}>
        <small>TRUE COST</small>
        <strong>128 460 Kč</strong>
        <div><span>Маржа</span><b>34.8%</b></div>
        <div><span>Клиент</span><b>196 900 Kč</b></div>
      </div>
      <div className={styles.microCard}><span>Price Book</span><b>214 позиций</b></div>
    </div>
  );
}

export function MarketingStorytellingSuite() {
  return (
    <div className={styles.suite}>
      <section className={styles.problemSection}>
        <div className={styles.sectionHead}>
          <span className={styles.eyebrow}>WHY MAKSTER QUOTE</span>
          <h2>Маржа теряется не в конце сметы. Она теряется между шагами.</h2>
          <p>Makster Quote связывает расчёт с реальной мебельной конструкцией, чтобы проект, себестоимость и цена клиенту не расходились по разным файлам.</p>
        </div>
        <div className={styles.problemGrid}>
          <div className={styles.painStack}>
            {painPoints.map(([n, title, text]) => (
              <article key={n}>
                <span>{n}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </article>
            ))}
          </div>
          <WorkshopScene />
        </div>
      </section>

      <section className={styles.materialSection}>
        <div className={styles.materialIntro}>
          <span className={styles.eyebrow}>MATERIAL INTELLIGENCE</span>
          <h2>Инструмент для мебели должен ощущаться как мебель.</h2>
          <p>Тёплая материальность Makster — это не декоративная тема. Она напоминает, что за цифрами стоят реальные фасады, плиты, фурнитура, работа и производство.</p>
        </div>
        <div className={styles.materialRail}>
          {materials.map(([name, label, cls], index) => (
            <article className={styles.materialCard} key={name}>
              <div className={`${styles.sample} ${cls}`}><span>{String(index + 1).padStart(2, '0')}</span></div>
              <h3>{name}</h3>
              <p>{label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.ecosystemSection}>
        <div className={styles.ecosystemHeader}>
          <div>
            <span className={styles.eyebrow}>MAKSTER ECOSYSTEM</span>
            <h2>Один проект. Одна логика. От первой цены до монтажа.</h2>
          </div>
          <p>Quote — не отдельный калькулятор. Это коммерческий вход в будущую цепочку Makster Atelier.</p>
        </div>
        <div className={styles.ecosystemFlow}>
          {ecosystem.map(([n, title, label, text], index) => (
            <article key={n} className={styles.ecosystemNode}>
              <div className={styles.nodeTop}><span>{n}</span><small>{label}</small></div>
              <h3>{title}</h3>
              <p>{text}</p>
              {index < ecosystem.length - 1 ? <div className={styles.connector}><i /></div> : null}
            </article>
          ))}
        </div>
        <div className={styles.ecosystemFooter}>
          <span>IDEA</span><i /><span>QUOTE</span><i /><span>VISUALIZE</span><i /><span>ENGINEER</span><i /><span>PRODUCE</span>
        </div>
      </section>
    </div>
  );
}
