'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MarketingMessages } from '@/lib/marketing-i18n';
import { MaksterQuoteLogo } from './brand-logo';
import styles from './embedded-quote.module.css';

const modules = [
  ['B01', 'Base 600', '600 × 720 × 560', '8 420 Kč'],
  ['B02', 'Drawer 800', '800 × 720 × 560', '11 380 Kč'],
  ['B03', 'Sink 800', '800 × 720 × 560', '9 180 Kč'],
  ['T01', 'Tall Oven', '600 × 2180 × 600', '14 760 Kč'],
];

type DemoMessages = MarketingMessages['demo'];
export type EmbeddedQuoteCopy = {
  demo: DemoMessages;
  openQuote: string;
  documents: string;
  app: {
    dashboard: string;
    newQuote: string;
    priceBook: string;
    cabinetLibrary: string;
    plan: string;
    materials: string;
    hardware: string;
    labour: string;
    overhead: string;
    margin: string;
    sellingPrice: string;
    installation: string;
  };
};

function ProjectView({ app, m }: { app: EmbeddedQuoteCopy['app']; m: DemoMessages }) {
  return <div className={styles.editorGrid}>
    <aside className={styles.modules}>
      <div className={styles.panelTitle}><span>{m.cabinets}</span><b>8</b></div>
      {modules.map(([code,name,size,price],i)=><button type="button" key={code} className={i===1?styles.moduleActive:''}>
        <span className={styles.cabinetIcon}><i/><i/><i/></span>
        <span><small>{code}</small><strong>{name}</strong><em>{size}</em></span><b>{price}</b>
      </button>)}
      <button type="button" className={styles.addModule}>{m.addModule}</button>
    </aside>
    <section className={styles.editor}>
      <div className={styles.panelHeader}><div><small>B02</small><h3>Drawer 800</h3></div><span>{m.saved}</span></div>
      <div className={styles.formBlock}><strong>{m.dimensions}</strong><div className={styles.fields3}>
        <label><span>{m.width}</span><b>800 mm</b></label><label><span>{m.height}</span><b>720 mm</b></label><label><span>{m.depth}</span><b>560 mm</b></label>
      </div></div>
      <div className={styles.formBlock}><strong>{m.construction}</strong><div className={styles.fields2}>
        <label><span>{m.cabinetBody}</span><b>EGGER U702 · 18 mm</b></label><label><span>{m.front}</span><b>Painted MDF</b></label>
        <label><span>{m.drawers}</span><b>3 × Blum LEGRABOX</b></label><label><span>{m.opening}</span><b>TIP-ON BLUMOTION</b></label>
      </div></div>
      <div className={styles.engine}><span>{m.construction}</span><b>{m.engineeringRule}</b><i>✓</i></div>
    </section>
    <aside className={styles.cost}>
      <div className={styles.live}><i/> {m.liveCost}</div>
      <div className={styles.costRows}><p><span>{app.materials}</span><b>66 340</b></p><p><span>{app.hardware}</span><b>31 520</b></p><p><span>{app.labour}</span><b>21 600</b></p><p><span>{app.overhead}</span><b>9 000</b></p></div>
      <div className={styles.trueCost}><span>TRUE COST</span><strong>128 460 Kč</strong></div>
      <div className={styles.margin}><span>{app.margin}</span><b>34.8%</b></div>
      <div className={styles.clientPrice}><span>{app.sellingPrice}</span><strong>196 900 Kč</strong><small>{m.withoutManual}</small></div>
    </aside>
  </div>;
}

function PriceView({ app, m }: { app: EmbeddedQuoteCopy['app']; m: DemoMessages }) {
  const rows = [[m.material,'EGGER U702 ST9 · 18 mm',m.sheet,'1 780 Kč'],[m.hardware,'Blum LEGRABOX M',m.set,'1 190 Kč'],[m.edge,'ABS U702 · 1 mm',m.metre,'18 Kč'],[app.labour,m.assembly,m.hour,'620 Kč'],[app.installation,m.installation,m.hour,'850 Kč']];
  return <div className={styles.priceView}>
    <div className={styles.priceHead}><div><small>YOUR PRICE BOOK</small><h3>{m.purchasePrices}</h3></div><button type="button">{m.addItem}</button></div>
    <div className={styles.priceTable}><div className={styles.tableHead}><span>{m.category}</span><span>{m.item}</span><span>{m.unit}</span><span>{m.price}</span></div>
      {rows.map(([a,b,c,d],i)=><div key={b} className={i===1?styles.priceActive:''}><span>{a}</span><strong>{b}</strong><span>{c}</span><b>{d}</b></div>)}
    </div>
    <div className={styles.priceHint}><b>214</b><span>{m.activeItems}</span><strong>{m.priceHint}</strong></div>
  </div>;
}

function ProposalView({ app, m }: { app: EmbeddedQuoteCopy['app']; m: DemoMessages }) {
  return <div className={styles.proposalView}>
    <div className={styles.document}>
      <div className={styles.documentHead}><MaksterQuoteLogo/><span>MQ-0082 · V3</span></div>
      <div className={styles.documentTitle}><small>{m.commercialProposal}</small><h3>Kitchen Praha</h3><p>{m.customKitchen}</p></div>
      <div className={styles.documentSketch}><i/><i/><i/><i/><span>3 640 mm</span></div>
      <div className={styles.documentRows}><p><span>{m.bodyAndFronts}</span><b>{m.included}</b></p><p><span>{m.hardware} Blum</span><b>{m.included}</b></p><p><span>{m.manufacturing}</span><b>{m.included}</b></p><p><span>{app.installation}</span><b>{m.included}</b></p></div>
      <div className={styles.documentTotal}><span>{m.total}</span><strong>196 900 Kč</strong></div>
    </div>
    <aside className={styles.pdfStatus}><span>CLIENT OUTPUT</span><strong>{m.pdfReady}</strong><div>✓</div><p>{m.versionSaved}</p><button type="button">{m.openPdf}</button></aside>
  </div>;
}

export function EmbeddedQuote({ copy }: { copy: EmbeddedQuoteCopy }) {
  const [view,setView] = useState<'project'|'prices'|'proposal'>('project');
  const { app, demo: m } = copy;
  return <section className={styles.section} id="workflow"><span id="product" aria-hidden="true"/>
    <header className={styles.heading}><span>{m.sectionLabel}</span><h2>{m.title}<em>{m.emphasis}</em></h2></header>
    <div className={styles.browser}>
      <div className={styles.chrome}><div><i/><i/><i/></div><span>Makster Quote · Kitchen Praha</span><b>{m.liveDemo}</b></div>
      <div className={styles.shell}>
        <aside className={styles.sidebar}><MaksterQuoteLogo variant="light"/><div className={styles.workshop}><small>{m.workshop}</small><b>Makster Atelier</b></div><nav><span>{app.dashboard}</span><strong>{app.newQuote}</strong><span>{app.priceBook}</span><span>{app.cabinetLibrary}</span><span>{copy.documents}</span></nav><div className={styles.plan}><small>{app.plan}</small><b>{m.pilot}</b></div></aside>
        <main className={styles.workspace}>
          <div className={styles.topbar}><div><small>{m.projectActive}</small><h3>Kitchen Praha</h3></div><div><button type="button">{app.priceBook}</button><button type="button" className={styles.primary}>{m.clientPdf}</button></div></div>
          <div className={styles.tabs}>
            <button type="button" className={view==='project'?styles.activeTab:''} onClick={()=>setView('project')}><span>01</span><b>{m.calculation}</b></button>
            <button type="button" className={view==='prices'?styles.activeTab:''} onClick={()=>setView('prices')}><span>02</span><b>Price Book</b></button>
            <button type="button" className={view==='proposal'?styles.activeTab:''} onClick={()=>setView('proposal')}><span>03</span><b>{m.proposal}</b></button>
          </div>
          <div className={styles.view}>{view==='project'?<ProjectView app={app} m={m}/>:view==='prices'?<PriceView app={app} m={m}/>:<ProposalView app={app} m={m}/>}</div>
        </main>
      </div>
    </div>
    <div className={styles.under}><strong>{m.flow}</strong><Link href="/login">{copy.openQuote} →</Link></div>
  </section>;
}
