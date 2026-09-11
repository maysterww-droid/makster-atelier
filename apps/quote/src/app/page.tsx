'use client';

import { useMemo, useState } from 'react';
import { calculateQuote, formatMinor } from '../lib/calculation';
import { getMessages, OWNER_DEFAULT_LOCALE } from '../lib/i18n';

function euros(value: number) {
  return BigInt(Math.round(value * 100));
}

export default function HomePage() {
  const m = getMessages(OWNER_DEFAULT_LOCALE);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(720);
  const [depth, setDepth] = useState(560);
  const [targetMargin, setTargetMargin] = useState(35);

  const result = useMemo(
    () =>
      calculateQuote({
        costs: {
          board: euros(118.4),
          fronts: euros(76.3),
          edges: euros(13.7),
          hardware: euros(111.9),
          production: euros(49.2),
          labour: euros(58),
          delivery: 0n,
          installation: 0n,
        },
        overheadBps: 850,
        targetMarginBps: Math.round(targetMargin * 100),
        taxBps: 2100,
      }),
    [targetMargin],
  );

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">M</div>
          <div>
            <strong>Makster</strong>
            <span>Quote</span>
          </div>
        </div>

        <nav>
          <button className="navItem active">{m.dashboard}</button>
          <button className="navItem">{m.projects}</button>
          <button className="navItem">{m.priceBook}</button>
          <button className="navItem">{m.cabinetLibrary}</button>
          <button className="navItem">{m.hardware}</button>
          <button className="navItem">{m.customers}</button>
          <button className="navItem">{m.documents}</button>
          <button className="navItem">{m.settings}</button>
        </nav>

        <div className="planCard">
          <span>Plan</span>
          <strong>FOUNDER PRO</strong>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">MQ 0.1.0 CORE</span>
            <h1>Кухня Müller</h1>
          </div>
          <button className="primary">+ {m.addCabinet}</button>
        </header>

        <div className="contentGrid">
          <section className="panel treePanel">
            <div className="panelHeader">
              <span>Структура заказа</span>
              <button className="iconButton">+</button>
            </div>
            <button className="cabinetRow selected">
              <span>B03</span>
              <div>
                <strong>Шкаф с ящиками</strong>
                <small>{width} × {height} × {depth} мм</small>
              </div>
            </button>
            <button className="cabinetRow muted">
              <span>B04</span>
              <div>
                <strong>Посудомоечная машина</strong>
                <small>600 × 720 × 560 мм</small>
              </div>
            </button>
          </section>

          <section className="panel editorPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">B03</span>
                <h2>Шкаф с ящиками</h2>
              </div>
              <span className="status">Черновик</span>
            </div>

            <div className="formSection">
              <h3>Размеры</h3>
              <div className="fieldGrid">
                <label>
                  Ширина, мм
                  <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
                </label>
                <label>
                  Высота, мм
                  <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
                </label>
                <label>
                  Глубина, мм
                  <input type="number" value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
                </label>
              </div>
            </div>

            <div className="formSection">
              <h3>Конструкция</h3>
              <div className="fieldGrid two">
                <label>
                  Корпус
                  <select defaultValue="Egger W980 ST2 — 18 мм">
                    <option>Egger W980 ST2 — 18 мм</option>
                  </select>
                </label>
                <label>
                  Задняя стенка
                  <select defaultValue="8 мм — в паз">
                    <option>8 мм — в паз</option>
                    <option>Накладная</option>
                  </select>
                </label>
                <label>
                  Фасад
                  <select defaultValue="Накладной">
                    <option>Накладной</option>
                    <option>Вкладной</option>
                  </select>
                </label>
                <label>
                  Ящики
                  <select defaultValue="2 × Blum LEGRABOX">
                    <option>2 × Blum LEGRABOX</option>
                    <option>2 × Blum TANDEMBOX</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="engineNote">
              <strong>Engineering Engine</strong>
              <span>Размеры деталей будут рассчитаны из конструкции, а не введены вручную.</span>
            </div>
          </section>

          <aside className="panel costPanel">
            <div className="panelHeader">
              <span>{m.trueCost}</span>
              <span className="liveDot">LIVE</span>
            </div>

            <div className="costRows">
              <div><span>Плита</span><strong>€118.40</strong></div>
              <div><span>{m.fronts}</span><strong>€76.30</strong></div>
              <div><span>{m.edges}</span><strong>€13.70</strong></div>
              <div><span>{m.hardware}</span><strong>€111.90</strong></div>
              <div><span>{m.production}</span><strong>€49.20</strong></div>
              <div><span>{m.labour}</span><strong>€58.00</strong></div>
              <div className="soft"><span>{m.overhead}</span><strong>{formatMinor(result.overheadMinor, 'EUR')}</strong></div>
            </div>

            <div className="trueCost">
              <span>{m.trueCost}</span>
              <strong>{formatMinor(result.trueCostMinor, 'EUR')}</strong>
            </div>

            <div className="priceHero">
              <span>{m.sellingPrice}</span>
              <strong>{formatMinor(result.netSalesMinor, 'EUR')}</strong>
              <small>+ VAT {formatMinor(result.taxMinor, 'EUR')}</small>
            </div>

            <div className="metrics">
              <div><span>{m.profit}</span><strong>{formatMinor(result.profitMinor, 'EUR')}</strong></div>
              <div><span>{m.margin}</span><strong>{(result.marginBps / 100).toFixed(2)}%</strong></div>
              <div><span>{m.markup}</span><strong>{(result.markupBps / 100).toFixed(2)}%</strong></div>
            </div>

            <label className="marginControl">
              <span>{m.targetMargin}: <strong>{targetMargin}%</strong></span>
              <input
                type="range"
                min="10"
                max="60"
                value={targetMargin}
                onChange={(e) => setTargetMargin(Number(e.target.value))}
              />
            </label>

            <button className="secondary">{m.clientQuote} →</button>
          </aside>
        </div>
      </section>
    </main>
  );
}
