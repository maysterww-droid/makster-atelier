import Link from 'next/link';
import { formatMinor } from '@/lib/calculation';
import {
  calculateProjectPricing,
  minorFromUnknown,
  readProjectCommercialSettings,
  type StoredCabinetCost,
} from '@/lib/project-pricing';
import { saveProjectCommercial } from './commercial-actions';

type ClientRow = { id: string; display_name: string; email: string | null; phone: string | null };
type PriceRow = { id: string; category: string; name: string; unit: string; purchase_price_minor: number | string };

type Props = {
  projectId: string;
  clientId: string | null;
  settings: Record<string, unknown> | null;
  clients: ClientRow[];
  priceBook: PriceRow[];
  cabinets: StoredCabinetCost[];
  currency: string;
  targetMarginBps: number;
  overheadBps: number;
};

function selectedMinor(items: PriceRow[], id: string) {
  const item = items.find((row) => row.id === id && row.unit === 'job');
  return minorFromUnknown(item?.purchase_price_minor);
}

function extraOptions(items: PriceRow[], category: string) {
  return items.filter((item) => item.category === category && item.unit === 'job');
}

export function ProjectCommercial({ projectId, clientId, settings, clients, priceBook, cabinets, currency, targetMarginBps, overheadBps }: Props) {
  const commercial = readProjectCommercialSettings(settings);
  const pricing = calculateProjectPricing(cabinets, {
    deliveryMinor: selectedMinor(priceBook, commercial.deliveryItemId),
    installationMinor: selectedMinor(priceBook, commercial.installationItemId),
    otherMinor: selectedMinor(priceBook, commercial.otherItemId),
  }, {
    targetMarginBps,
    overheadBps,
    taxBps: commercial.taxBps,
  });

  const delivery = extraOptions(priceBook, 'delivery');
  const installation = extraOptions(priceBook, 'installation');
  const other = extraOptions(priceBook, 'other');
  const quoteReady = pricing.cabinetCount > 0 && pricing.incompleteCabinets === 0;

  return <section className="pageContent compact">
    <div className="panel">
      <div className="panelHeader">
        <div><span className="eyebrow">ИТОГ ПРОЕКТА · MQ 0.1.3</span><h2>Коммерческий расчёт</h2></div>
        <Link href={`/projects/${projectId}/quote`} className="primary linkButton" target="_blank">Предложение / PDF →</Link>
      </div>
      <div className="padded">
        {!quoteReady ? <div className="notice warning"><strong>Предложение пока черновое.</strong> Сохранено модулей: {pricing.cabinetCount}; неполных расчётов: {pricing.incompleteCabinets}. Недостающие цены видны справа в редакторе модуля.</div> : <div className="notice success"><strong>Все сохранённые модули рассчитаны полностью.</strong> Клиентское предложение можно печатать или сохранить в PDF.</div>}
        <section className="metricGrid commercialMetrics">
          <article className="metricCard"><span>Прямая себестоимость</span><strong>{formatMinor(pricing.pricing.directCostMinor, currency)}</strong><small>модули + выбранные услуги</small></article>
          <article className="metricCard"><span>Полная себестоимость</span><strong>{formatMinor(pricing.pricing.trueCostMinor, currency)}</strong><small>с накладными {(overheadBps / 100).toFixed(2)}%</small></article>
          <article className="metricCard"><span>Цена без НДС</span><strong>{formatMinor(pricing.pricing.netSalesMinor, currency)}</strong><small>целевая маржа {(targetMarginBps / 100).toFixed(2)}%</small></article>
          <article className="metricCard"><span>К оплате</span><strong>{formatMinor(pricing.pricing.grossSalesMinor, currency)}</strong><small>налог {(commercial.taxBps / 100).toFixed(2)}%</small></article>
        </section>

        <form action={saveProjectCommercial} className="stackForm commercialForm">
          <input type="hidden" name="projectId" value={projectId}/>
          <div className="formGrid3">
            <label>Клиент<select name="clientId" defaultValue={clientId ?? ''}><option value="">— не выбран —</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.display_name}</option>)}</select></label>
            <label>НДС / налог, %<input name="taxPercent" type="number" min="0" max="1000" step="0.01" defaultValue={(commercial.taxBps / 100).toFixed(2)}/></label>
            <label>Предложение действует, дней<input name="validityDays" type="number" min="1" max="365" defaultValue={commercial.validityDays}/></label>
          </div>
          <div className="formGrid3">
            <label>Доставка<select name="deliveryItemId" defaultValue={commercial.deliveryItemId}><option value="">— не учитывать —</option>{delivery.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatMinor(minorFromUnknown(item.purchase_price_minor), currency)}</option>)}</select></label>
            <label>Монтаж<select name="installationItemId" defaultValue={commercial.installationItemId}><option value="">— не учитывать —</option>{installation.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatMinor(minorFromUnknown(item.purchase_price_minor), currency)}</option>)}</select></label>
            <label>Прочие расходы<select name="otherItemId" defaultValue={commercial.otherItemId}><option value="">— не учитывать —</option>{other.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatMinor(minorFromUnknown(item.purchase_price_minor), currency)}</option>)}</select></label>
          </div>
          <p className="muted">В итог проекта попадают только позиции доставки, монтажа и прочих расходов с единицей «заказ». Почасовые и погонные ставки нельзя случайно применить как фиксированную сумму.</p>
          <div className="formGrid3">
            <label>Язык документа<select name="documentLocale" defaultValue={commercial.documentLocale}><option value="ru">Русский</option><option value="cs">Čeština</option><option value="de">Deutsch</option><option value="pl">Polski</option><option value="en">English</option></select></label>
            <label>Новый клиент — имя<input name="newClientName" placeholder="Заполните только если клиента ещё нет"/></label>
            <label>Новый клиент — email<input name="newClientEmail" type="email" placeholder="client@example.com"/></label>
          </div>
          <div className="formGrid3">
            <label>Новый клиент — телефон<input name="newClientPhone"/></label>
            <label>Новый клиент — адрес<input name="newClientAddress" placeholder="Улица, город, индекс"/></label>
            <label>Комментарий для клиента<textarea name="clientNote" rows={3} defaultValue={commercial.clientNote} placeholder="Например: срок изготовления 5–6 недель после аванса."/></label>
          </div>
          <div className="formActions"><Link href="/price-book" className="secondary linkButton">Настроить цены услуг</Link><button type="submit" className="primary">Сохранить итог проекта</button></div>
        </form>
      </div>
    </div>
  </section>;
}
