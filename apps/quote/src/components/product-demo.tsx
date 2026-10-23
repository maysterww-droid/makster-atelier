'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './product-demo.module.css';

const stages = [
  { label: '01', title: 'Конструкция', short: '8 модулей' },
  { label: '02', title: 'Price Book', short: 'ваши цены' },
  { label: '03', title: 'True Cost', short: '128 460 Kč' },
  { label: '04', title: 'Клиент', short: '196 900 Kč' },
];

const modules = [
  ['Base 600', '8 420 Kč'],
  ['Drawer 800', '11 380 Kč'],
  ['Tall Oven', '14 760 Kč'],
];

export function ProductDemo() {
  const [stage, setStage] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (manual) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setStage((current) => (current + 1) % stages.length), 2600);
    return () => window.clearInterval(id);
  }, [manual]);

  const selectStage = (index: number) => {
    setManual(true);
    setStage(index);
  };

  return (
    <section className={styles.section} id="workflow">
      <span id="product" aria-hidden="true" />
      <div className={styles.head}>
        <div>
          <span className={styles.eyebrow}>LIVE PRODUCT DEMO</span>
          <h2>Один проект.<br/><em>Цена собирается сама.</em></h2>
        </div>
        <p>Нажмите на этап — или просто смотрите, как конструкция превращается в цену для клиента.</p>
      </div>

      <div className={styles.stageTabs} aria-label="Этапы расчёта">
        {stages.map((item, index) => (
          <button
            type="button"
            key={item.label}
            className={index === stage ? styles.activeTab : ''}
            onClick={() => selectStage(index)}
          >
            <small>{item.label}</small>
            <b>{item.title}</b>
            <span>{item.short}</span>
          </button>
        ))}
      </div>

      <div className={`${styles.demoShell} ${styles[`stage${stage}`]}`}>
        <div className={styles.topbar}>
          <div className={styles.dots}><i/><i/><i/></div>
          <span>Kitchen Praha · MQ-0082</span>
          <b>LIVE</b>
        </div>

        <div className={styles.demoGrid}>
          <div className={styles.projectCanvas}>
            <div className={styles.canvasHeader}>
              <div><small>PROJECT</small><strong>Kitchen Praha</strong></div>
              <span>8 модулей</span>
            </div>

            <div className={styles.kitchenSketch} aria-label="Схема кухонного проекта">
              <div className={styles.tall}/><div className={styles.base}/><div className={styles.drawer}/><div className={styles.base2}/>
              <div className={styles.worktop}/>
              <div className={styles.measure}>3 640 mm</div>
            </div>

            <div className={styles.moduleList}>
              {modules.map(([name, price], index) => (
                <div key={name} className={index === 1 ? styles.selectedModule : ''}>
                  <i/>
                  <span><b>{name}</b><small>{index === 1 ? '3 × LEGRABOX · painted MDF' : 'корпус 18 mm'}</small></span>
                  <em>{price}</em>
                </div>
              ))}
            </div>
          </div>

          <aside className={styles.calculation}>
            <div className={styles.priceBook}>
              <div className={styles.panelLabel}>YOUR PRICE BOOK</div>
              <p><span>Egger U702 ST9</span><b>1 780 Kč</b></p>
              <p><span>Blum LEGRABOX</span><b>1 190 Kč</b></p>
              <p><span>Работа / час</span><b>620 Kč</b></p>
            </div>

            <div className={styles.costBox}>
              <div className={styles.panelLabel}>TRUE COST</div>
              <strong>128 460 Kč</strong>
              <p><span>Материалы</span><b>66 340</b></p>
              <p><span>Фурнитура</span><b>31 520</b></p>
              <p><span>Работа + накладные</span><b>30 600</b></p>
              <div className={styles.margin}><span>Маржа</span><b>34.8%</b></div>
            </div>

            <div className={styles.clientBox}>
              <span>ЦЕНА КЛИЕНТУ</span>
              <strong>196 900 Kč</strong>
              <div className={styles.pdfMini}><b>PDF</b><span>предложение готово</span><i>✓</i></div>
            </div>
          </aside>
        </div>

        <div className={styles.demoCaption}>
          <span>{stages[stage].label}</span>
          <b>{stage === 0 && 'Собираем конструкцию'}{stage === 1 && 'Подтягиваем ваши закупочные цены'}{stage === 2 && 'Считаем реальную себестоимость и маржу'}{stage === 3 && 'Формируем цену и PDF клиенту'}</b>
          <div className={styles.progress}><i style={{ width: `${((stage + 1) / 4) * 100}%` }}/></div>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href="/login">Открыть Makster Quote <span>→</span></Link>
        <a href="#pricing">Посмотреть тарифы</a>
      </div>
    </section>
  );
}
