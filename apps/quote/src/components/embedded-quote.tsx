'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MaksterQuoteLogo } from './brand-logo';
import styles from './embedded-quote.module.css';

const modules = [
  ['B01', 'Base 600', '600 × 720 × 560', '8 420 Kč'],
  ['B02', 'Drawer 800', '800 × 720 × 560', '11 380 Kč'],
  ['B03', 'Sink 800', '800 × 720 × 560', '9 180 Kč'],
  ['T01', 'Tall Oven', '600 × 2180 × 600', '14 760 Kč'],
];

function ProjectView() {
  return <div className={styles.editorGrid}>
    <aside className={styles.modules}>
      <div className={styles.panelTitle}><span>КОРПУСА</span><b>8</b></div>
      {modules.map(([code,name,size,price],i)=><button type="button" key={code} className={i===1?styles.moduleActive:''}>
        <span className={styles.cabinetIcon}><i/><i/><i/></span>
        <span><small>{code}</small><strong>{name}</strong><em>{size}</em></span><b>{price}</b>
      </button>)}
      <button type="button" className={styles.addModule}>+ Добавить модуль</button>
    </aside>
    <section className={styles.editor}>
      <div className={styles.panelHeader}><div><small>МОДУЛЬ B02</small><h3>Drawer 800</h3></div><span>Сохранено ✓</span></div>
      <div className={styles.formBlock}><strong>Габариты</strong><div className={styles.fields3}>
        <label><span>Ширина</span><b>800 mm</b></label><label><span>Высота</span><b>720 mm</b></label><label><span>Глубина</span><b>560 mm</b></label>
      </div></div>
      <div className={styles.formBlock}><strong>Конструкция</strong><div className={styles.fields2}>
        <label><span>Корпус</span><b>EGGER U702 · 18 mm</b></label><label><span>Фасад</span><b>Painted MDF</b></label>
        <label><span>Ящики</span><b>3 × Blum LEGRABOX</b></label><label><span>Открывание</span><b>TIP-ON BLUMOTION</b></label>
      </div></div>
      <div className={styles.engine}><span>ENGINEERING</span><b>18 mm · зазоры 2 mm · задняя стенка в паз</b><i>✓</i></div>
    </section>
    <aside className={styles.cost}>
      <div className={styles.live}><i/> LIVE COST</div>
      <div className={styles.costRows}><p><span>Материалы</span><b>66 340</b></p><p><span>Фурнитура</span><b>31 520</b></p><p><span>Работа</span><b>21 600</b></p><p><span>Накладные</span><b>9 000</b></p></div>
      <div className={styles.trueCost}><span>TRUE COST</span><strong>128 460 Kč</strong></div>
      <div className={styles.margin}><span>Маржа</span><b>34.8%</b></div>
      <div className={styles.clientPrice}><span>ЦЕНА КЛИЕНТУ</span><strong>196 900 Kč</strong><small>без ручного пересчёта</small></div>
    </aside>
  </div>;
}

function PriceView() {
  const rows = [['Материал','EGGER U702 ST9 · 18 mm','лист','1 780 Kč'],['Фурнитура','Blum LEGRABOX M','компл.','1 190 Kč'],['Кромка','ABS U702 · 1 mm','м','18 Kč'],['Работа','Сборка мастерской','ч','620 Kč'],['Монтаж','Монтаж на объекте','ч','850 Kč']];
  return <div className={styles.priceView}>
    <div className={styles.priceHead}><div><small>YOUR PRICE BOOK</small><h3>Закупочные цены мастерской</h3></div><button type="button">+ Позиция</button></div>
    <div className={styles.priceTable}><div className={styles.tableHead}><span>Категория</span><span>Позиция</span><span>Ед.</span><span>Цена</span></div>
      {rows.map(([a,b,c,d],i)=><div key={b} className={i===1?styles.priceActive:''}><span>{a}</span><strong>{b}</strong><span>{c}</span><b>{d}</b></div>)}
    </div>
    <div className={styles.priceHint}><b>214</b><span>активных позиций</span><strong>Quote считает по вашим ценам</strong></div>
  </div>;
}

function ProposalView() {
  return <div className={styles.proposalView}>
    <div className={styles.document}>
      <div className={styles.documentHead}><MaksterQuoteLogo/><span>MQ-0082 · V3</span></div>
      <div className={styles.documentTitle}><small>КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ</small><h3>Kitchen Praha</h3><p>Индивидуальная кухня · Praha</p></div>
      <div className={styles.documentSketch}><i/><i/><i/><i/><span>3 640 mm</span></div>
      <div className={styles.documentRows}><p><span>Корпус и фасады</span><b>включено</b></p><p><span>Фурнитура Blum</span><b>включено</b></p><p><span>Изготовление</span><b>включено</b></p><p><span>Монтаж</span><b>включено</b></p></div>
      <div className={styles.documentTotal}><span>ИТОГО</span><strong>196 900 Kč</strong></div>
    </div>
    <aside className={styles.pdfStatus}><span>CLIENT OUTPUT</span><strong>PDF готов</strong><div>✓</div><p>Версия V3 сохранена</p><button type="button">Открыть PDF</button></aside>
  </div>;
}

export function EmbeddedQuote() {
  const [view,setView] = useState<'project'|'prices'|'proposal'>('project');
  return <section className={styles.section} id="workflow"><span id="product" aria-hidden="true"/>
    <header className={styles.heading}><span>MAKSTER QUOTE / PRODUCT</span><h2>Вот сама <em>программа.</em></h2></header>
    <div className={styles.browser}>
      <div className={styles.chrome}><div><i/><i/><i/></div><span>Makster Quote · Kitchen Praha</span><b>LIVE DEMO</b></div>
      <div className={styles.shell}>
        <aside className={styles.sidebar}><MaksterQuoteLogo variant="light"/><div className={styles.workshop}><small>МАСТЕРСКАЯ</small><b>Makster Atelier</b></div><nav><span>Главная</span><strong>Новый расчёт</strong><span>Прайс-лист</span><span>Библиотека модулей</span><span>Документы</span></nav><div className={styles.plan}><small>ТАРИФ</small><b>PILOT</b></div></aside>
        <main className={styles.workspace}>
          <div className={styles.topbar}><div><small>KITCHEN · ACTIVE</small><h3>Kitchen Praha</h3></div><div><button type="button">Прайс-лист</button><button type="button" className={styles.primary}>PDF клиента</button></div></div>
          <div className={styles.tabs}>
            <button type="button" className={view==='project'?styles.activeTab:''} onClick={()=>setView('project')}><span>01</span><b>Расчёт</b></button>
            <button type="button" className={view==='prices'?styles.activeTab:''} onClick={()=>setView('prices')}><span>02</span><b>Price Book</b></button>
            <button type="button" className={view==='proposal'?styles.activeTab:''} onClick={()=>setView('proposal')}><span>03</span><b>Предложение</b></button>
          </div>
          <div className={styles.view}>{view==='project'?<ProjectView/>:view==='prices'?<PriceView/>:<ProposalView/>}</div>
        </main>
      </div>
    </div>
    <div className={styles.under}><strong>Конструкция → реальные цены → True Cost → цена клиенту.</strong><Link href="/login">Открыть Makster Quote →</Link></div>
  </section>;
}
