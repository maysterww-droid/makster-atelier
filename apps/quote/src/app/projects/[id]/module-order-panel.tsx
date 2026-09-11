import { moveCabinet } from './actions';

type CabinetOrderRow = {
  id: string;
  name: string;
  quantity: number | string;
  width_mm: number | string;
  height_mm: number | string;
  depth_mm: number | string;
};

type Props = {
  projectId: string;
  cabinets: CabinetOrderRow[];
};

function quantity(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1;
}

export function ModuleOrderPanel({ projectId, cabinets }: Props) {
  if (cabinets.length < 2) return null;

  return <section className="pageContent compact">
    <div className="panel">
      <div className="panelHeader">
        <div><span className="eyebrow">ПОРЯДОК В ПРЕДЛОЖЕНИИ · MQ 0.1.8</span><h3>Порядок модулей</h3><p className="muted">Этот порядок используется в рабочем проекте и в следующих выпущенных предложениях. Уже выпущенные версии остаются неизменными.</p></div>
      </div>
      <div className="priceList">
        {cabinets.map((cabinet, index) => <article className="priceRow" key={cabinet.id}>
          <div>
            <span className="pill">{index + 1}</span>
            <strong>{cabinet.name}{quantity(cabinet.quantity) > 1 ? ` × ${quantity(cabinet.quantity)}` : ''}</strong>
            <small>{Number(cabinet.width_mm)} × {Number(cabinet.height_mm)} × {Number(cabinet.depth_mm)} мм</small>
          </div>
          <div className="topActions">
            <form action={moveCabinet}>
              <input type="hidden" name="projectId" value={projectId}/>
              <input type="hidden" name="cabinetId" value={cabinet.id}/>
              <button className="secondary" type="submit" name="direction" value="up" disabled={index === 0}>↑ Выше</button>
            </form>
            <form action={moveCabinet}>
              <input type="hidden" name="projectId" value={projectId}/>
              <input type="hidden" name="cabinetId" value={cabinet.id}/>
              <button className="secondary" type="submit" name="direction" value="down" disabled={index === cabinets.length - 1}>↓ Ниже</button>
            </form>
          </div>
        </article>)}
      </div>
    </div>
  </section>;
}
