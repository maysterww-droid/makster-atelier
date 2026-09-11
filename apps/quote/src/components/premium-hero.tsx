import Link from 'next/link';
import { MaksterQuoteLogo } from './brand-logo';
import styles from './premium-polish.module.css';

function QuoteCockpit() {
  return (
    <div className={styles.cockpit} aria-label="Makster Quote live project preview">
      <div className={styles.cockpitChrome}>
        <div className={styles.chromeDots}><i/><i/><i/></div>
        <span>Kitchen Praha · MQ-0082</span>
        <b>LIVE</b>
      </div>
      <div className={styles.cockpitBody}>
        <aside>
          <MaksterQuoteLogo compact variant="light" />
          <span className={styles.activeNav}>Обзор</span>
          <span>Конструкция</span>
          <span>Price Book</span>
          <span>Документы</span>
        </aside>
        <div className={styles.workspace}>
          <div className={styles.workspaceHead}>
            <div><small>PROJECT MQ-0082</small><strong>Kitchen Praha</strong></div>
            <button>PDF</button>
          </div>
          <div className={styles.metrics}>
            <article><span>Себестоимость</span><b>128 460 Kč</b></article>
            <article><span>Маржа</span><b>34.8%</b></article>
            <article className={styles.clientMetric}><span>Цена клиенту</span><b>196 900 Kč</b></article>
          </div>
          <div className={styles.projectGrid}>
            <div className={styles.modules}>
              <small>КОРПУСА · 8</small>
              <div><i/><span><b>Base 600</b><small>2 фасада · 3 полки</small></span><em>8 420</em></div>
              <div className={styles.activeModule}><i/><span><b>Drawer 800</b><small>3 × LEGRABOX</small></span><em>11 380</em></div>
              <div><i/><span><b>Tall Oven</b><small>духовой шкаф</small></span><em>14 760</em></div>
            </div>
            <div className={styles.trueCost}>
              <small>TRUE COST</small>
              <p><span>Материалы</span><b>66 340</b></p>
              <p><span>Фурнитура</span><b>31 520</b></p>
              <p><span>Работа</span><b>21 600</b></p>
              <p><span>Накладные</span><b>9 000</b></p>
              <strong>128 460 Kč</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PremiumHero() {
  return (
    <section className={styles.hero}>
      <div className={styles.grain}/>
      <div className={styles.heroCopy}>
        <div className={styles.heroBrand}><MaksterQuoteLogo /></div>
        <span className={styles.eyebrow}>СОФТ ДЛЯ МЕБЕЛЬЩИКОВ И МАСТЕРСКИХ</span>
        <h1>Смета и маржа — <em>прямо из мебельного проекта.</em></h1>
        <p><strong>Makster Quote</strong> считает конструкцию, себестоимость и цену клиенту по вашим реальным закупочным ценам.</p>
        <div className={styles.actions}>
          <Link href="/login" className={styles.primary}>Открыть Makster Quote <span>→</span></Link>
          <a href="#workflow" className={styles.secondary}>Показать программу</a>
        </div>
      </div>
      <div className={styles.visualStage}>
        <div className="mq-software-tag">FURNITURE PRICING SOFTWARE</div>
        <div className="mq-live-project"><span>LIVE PROJECT</span><b>MQ-0082</b><em>8 модулей · 34.8% маржа</em></div>
        <QuoteCockpit />
      </div>
    </section>
  );
}
