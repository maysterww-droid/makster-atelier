import styles from './visual-workflow.module.css';

function CabinetGlyph() {
  return <div className={styles.cabinetGlyph}><i/><i/><i/></div>;
}

function PriceGlyph() {
  return <div className={styles.priceGlyph}><span>EGGER</span><b>1 780 Kč</b><span>BLUM</span><b>1 190 Kč</b></div>;
}

function CostGlyph() {
  return <div className={styles.costGlyph}><small>TRUE COST</small><strong>128 460 Kč</strong><div><span>Маржа</span><b>34.8%</b></div></div>;
}

function PdfGlyph() {
  return <div className={styles.pdfGlyph}><small>PDF</small><b>KITCHEN PRAHA</b><i/><i/><strong>196 900 Kč</strong></div>;
}

const steps = [
  { n:'01', title:'Соберите мебель', caption:'Корпуса, фасады, фурнитура', visual:<CabinetGlyph/> },
  { n:'02', title:'Подтяните свои цены', caption:'Ваш Price Book', visual:<PriceGlyph/> },
  { n:'03', title:'Получите True Cost', caption:'Себестоимость + маржа', visual:<CostGlyph/> },
  { n:'04', title:'Отправьте клиенту', caption:'Цена + готовый PDF', visual:<PdfGlyph/> },
];

export function VisualWorkflow() {
  return (
    <section id="workflow" className={styles.section}>
      <div className={styles.head}>
        <span>КАК ЭТО РАБОТАЕТ</span>
        <h2>Один проект. Четыре понятных шага.</h2>
        <p>Makster Quote превращает мебельную конструкцию в цену для клиента — без параллельного Excel.</p>
      </div>
      <div className={styles.flow}>
        <div className={styles.track}><i/></div>
        {steps.map((step, index) => (
          <article key={step.n} className={styles.card} style={{'--i': index} as React.CSSProperties}>
            <div className={styles.cardTop}><span>{step.n}</span><em>{step.caption}</em></div>
            <div className={styles.visual}>{step.visual}</div>
            <h3>{step.title}</h3>
          </article>
        ))}
      </div>
      <div className={styles.resultBar}>
        <span>КОНСТРУКЦИЯ</span><i>→</i><span>ЦЕНЫ</span><i>→</i><span>TRUE COST</span><i>→</i><strong>ПРЕДЛОЖЕНИЕ ГОТОВО</strong>
      </div>
    </section>
  );
}
