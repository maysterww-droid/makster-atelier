'use client';

import { useEffect, useState } from 'react';
import styles from './visual-workflow.module.css';

const steps = [
  { n: '01', short: 'Конструкция', title: 'Соберите мебель', caption: 'Корпуса, фасады и фурнитура становятся одной моделью.' },
  { n: '02', short: 'Price Book', title: 'Подтяните свои цены', caption: 'Материалы, Blum, работа и операции — из вашей базы.' },
  { n: '03', short: 'True Cost', title: 'Увидьте себестоимость и маржу', caption: 'Makster сразу показывает реальную стоимость и прибыль проекта.' },
  { n: '04', short: 'PDF', title: 'Отправьте цену клиенту', caption: 'Из расчёта рождается готовое коммерческое предложение.' },
];

function CabinetScene() {
  return (
    <div className={styles.cabinetScene}>
      <div className={styles.worktop} />
      <div className={`${styles.cabinet} ${styles.tall}`}><i/><i/></div>
      <div className={`${styles.cabinet} ${styles.base}`}><i/></div>
      <div className={`${styles.cabinet} ${styles.drawer}`}><i/><i/><i/></div>
      <div className={styles.dimension}><span>3 640 mm</span></div>
    </div>
  );
}

function PriceScene() {
  return (
    <div className={styles.priceScene}>
      <div><span>EGGER W1100</span><small>материал</small><b>1 780 Kč</b></div>
      <div><span>Blum LEGRABOX</span><small>фурнитура</small><b>1 190 Kč</b></div>
      <div><span>Монтаж</span><small>работа</small><b>620 Kč / ч</b></div>
      <strong className={styles.priceBookBadge}>YOUR PRICE BOOK</strong>
    </div>
  );
}

function CostScene() {
  return (
    <div className={styles.costScene}>
      <div className={styles.costMain}><small>TRUE COST</small><strong>128 460 Kč</strong><span>себестоимость проекта</span></div>
      <div className={styles.marginDial}><div><b>34.8%</b><small>маржа</small></div></div>
      <div className={styles.clientPrice}><span>Цена клиенту</span><b>196 900 Kč</b></div>
    </div>
  );
}

function PdfScene() {
  return (
    <div className={styles.pdfScene}>
      <div className={styles.pdfPage}>
        <div className={styles.pdfBrand}><span>M</span><b>MAKSTER QUOTE</b></div>
        <small>COMMERCIAL OFFER · MQ-0082</small>
        <h4>KITCHEN PRAHA</h4>
        <i/><i/><i/>
        <div><span>Итого</span><strong>196 900 Kč</strong></div>
      </div>
      <div className={styles.sentBadge}><span>✓</span><b>Предложение готово</b><small>PDF для клиента</small></div>
    </div>
  );
}

function StageVisual({ index }: { index: number }) {
  if (index === 0) return <CabinetScene />;
  if (index === 1) return <PriceScene />;
  if (index === 2) return <CostScene />;
  return <PdfScene />;
}

export function VisualWorkflow() {
  const [active, setActive] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % steps.length), 2600);
    return () => window.clearTimeout(timer);
  }, [active, reducedMotion]);

  const step = steps[active];

  return (
    <section id="workflow" className={styles.section}>
      <div className={styles.head}>
        <span>КАК ЭТО РАБОТАЕТ</span>
        <h2>Проект сам превращается в цену.</h2>
        <p>Четыре шага. Один поток данных. Без отдельной жизни в Excel.</p>
      </div>

      <div className={styles.story}>
        <div className={styles.storyTop}>
          <span>{step.n} / 04</span>
          <div className={styles.progress}><i style={{ width: `${((active + 1) / steps.length) * 100}%` }} /></div>
          <b>LIVE WORKFLOW</b>
        </div>

        <div className={styles.storyBody} key={step.n}>
          <div className={styles.copy}>
            <small>{step.short}</small>
            <h3>{step.title}</h3>
            <p>{step.caption}</p>
          </div>
          <div className={styles.stage} aria-live="polite">
            <StageVisual index={active} />
          </div>
        </div>

        <div className={styles.stepNav} aria-label="Этапы расчёта">
          {steps.map((item, index) => (
            <button key={item.n} type="button" className={index === active ? styles.active : ''} onClick={() => setActive(index)}>
              <span>{item.n}</span><b>{item.short}</b>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
