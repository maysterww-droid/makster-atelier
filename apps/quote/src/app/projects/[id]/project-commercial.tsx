import Link from 'next/link';
import { formatMinor } from '@/lib/calculation';
import {
  calculateDepositMinor,
  calculateProjectPricing,
  minorFromUnknown,
  readProjectCommercialSettings,
  type StoredCabinetCost,
} from '@/lib/project-pricing';
import { saveProjectCommercial } from './commercial-actions';
import { publishCommercialQuote } from './publish-actions';

type ClientRow = { id: string; display_name: string; email: string | null; phone: string | null };
type PriceRow = { id: string; category: string; name: string; unit: string; purchase_price_minor: number | string };
type QuoteRow = { id: string; quote_version: number; issued_at: string; valid_until: string; total_amount_minor: number | string; client_name: string };
type StatusRow = { quote_id: string; status: string; created_at: string; note: string | null };

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
  role: string;
  quoteHistory: QuoteRow[];
  statusEvents: StatusRow[];
};

function selectedMinor(items: PriceRow[], id: string) {
  const item = items.find((row) => row.id === id && row.unit === 'job');
  return minorFromUnknown(item?.purchase_price_minor);
}

function extraOptions(items: PriceRow[], category: string) {
  return items.filter((item) => item.category === category && item.unit === 'job');
}

const statusName: Record<string, string> = {
  draft:'Черновик', approved:'Выпущено', sent:'Отправлено', accepted:'Принято', rejected:'Отклонено', expired:'Истекло', superseded:'Заменено',
};

function latestStatus(quoteId: string, events: StatusRow[]) {
  return events.find((event) => event.quote_id === quoteId)?.status ?? 'approved';
}

export function ProjectCommercial({ projectId, clientId, settings, clients, priceBook, cabinets, currency, targetMarginBps, overheadBps, role, quoteHistory, statusEvents }: Props) {
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
  const canPublish = ['owner', 'admin', 'technologist'].includes(role);
  const depositMinor = calculateDepositMinor(pricing.pricing.grossSalesMinor, commercial.depositBps);

  return <section className="pageContent compact">
    <div className="panel">
      <div className="panelHeader">
        <div><span className="eyebrow">ИТОГ ПРОЕКТА · MQ 0.1.4</span><h2>Коммерческий расчёт</h2></div>
        <div className="topActions"><Link href={`/projects/${projectId}/quote`} className="secondary linkButton" target="_blank">Живой просмотр</Link>{canPublish ? <form action={publishCommercialQuote}><input type="hidden" name="projectId" value={projectId}/><button className="primary" type="submit" disabled={!quoteReady || !clientId}>Выпустить версию</button></form> : null}</div>
      </div>
      <div className="padded">
        {!quoteReady ? <div className="notice warning"><strong>Предложение пока черновое.</strong> Сохранено модулей: {pricing.cabinetCount}; неполных расчётов: {pricing.incompleteCabinets}. Выпуск версии заблокирован до заполнения цен.</div> : !clientId ? <div className="notice warning"><strong>Выберите и сохраните клиента.</strong> После этого можно выпустить неизменяемую версию предложения.</div> : <div className="notice success"><strong>Готово к выпуску.</strong> Выпущенная версия зафиксирует клиента, реквизиты, модули, цену и условия; будущие правки проекта её не изменят.</div>}
        <section className="metricGrid commercialMetrics">
          <article className="metricCard"><span>Прямая себестоимость</span><strong>{formatMinor(pricing.pricing.directCostMinor, currency)}</strong><small>модули + выбранные услуги</small></article>
          <article className="metricCard"><span>Полная себестоимость</span><strong>{formatMinor(pricing.pricing.trueCostMinor, currency)}</strong><small>с накладными {(overheadBps / 100).toFixed(2)}%</small></article>
          <article className="metricCard"><span>Цена без НДС</span><strong>{formatMinor(pricing.pricing.netSalesMinor, currency)}</strong><small>целевая маржа {(targetMarginBps / 100).toFixed(2)}%</small></article>
          <article className="metricCard"><span>К оплате</span><strong>{formatMinor(pricing.pricing.grossSalesMinor, currency)}</strong><small>{commercial.depositBps > 0 ? `аванс ${formatMinor(depositMinor, currency)}` : `налог ${(commercial.taxBps / 100).toFixed(2)}%`}</small></article>
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
          <p className="muted">В итог проекта попадают только позиции доставки, монтажа и прочих расходов с единицей «заказ».</p>
          <div className="formGrid3">
            <label>Язык документа<select name="documentLocale" defaultValue={commercial.documentLocale}><option value="ru">Русский</option><option value="cs">Čeština</option><option value="de">Deutsch</option><option value="pl">Polski</option><option value="en">English</option></select></label>
            <label>Аванс, %<input name="depositPercent" type="number" min="0" max="100" step="0.01" defaultValue={(commercial.depositBps / 100).toFixed(2)}/></label>
            <label>Срок изготовления<input name="productionLeadText" defaultValue={commercial.productionLeadText} placeholder="Например: 5–6 недель после аванса"/></label>
          </div>
          <div className="formGrid2"><label>Условия оплаты<textarea name="paymentTerms" rows={3} defaultValue={commercial.paymentTerms} placeholder="Например: 50% аванс, 40% перед доставкой, 10% после монтажа."/></label><label>Гарантия / условия<textarea name="warrantyText" rows={3} defaultValue={commercial.warrantyText}/></label></div>
          <div className="formGrid3">
            <label>Новый клиент — имя<input name="newClientName" placeholder="Заполните только если клиента ещё нет"/></label>
            <label>Новый клиент — email<input name="newClientEmail" type="email" placeholder="client@example.com"/></label>
            <label>Новый клиент — телефон<input name="newClientPhone"/></label>
          </div>
          <div className="formGrid2"><label>Новый клиент — адрес<input name="newClientAddress" placeholder="Улица, город, индекс"/></label><label>Комментарий для клиента<textarea name="clientNote" rows={3} defaultValue={commercial.clientNote}/></label></div>
          <div className="formActions"><Link href="/settings/quote" className="secondary linkButton">Реквизиты документа</Link><Link href="/price-book" className="secondary linkButton">Цены услуг</Link><button type="submit" className="primary">Сохранить условия</button></div>
        </form>

        <section style={{marginTop:32}}>
          <div className="panelHeader"><div><span className="eyebrow">ИСТОРИЯ ПРЕДЛОЖЕНИЙ</span><h3>{quoteHistory.length ? `${quoteHistory.length} выпущенных версий` : 'Версий пока нет'}</h3></div></div>
          {!quoteHistory.length ? <p className="muted">После «Выпустить версию» здесь появится неизменяемый snapshot с собственным PDF и историей статусов.</p> : <div className="priceList">{quoteHistory.map((quote) => { const status = latestStatus(quote.id, statusEvents); return <article className="priceRow" key={quote.id}><div><span className="pill">v{quote.quote_version} · {statusName[status] ?? status}</span><strong>{quote.client_name}</strong><small>{new Intl.DateTimeFormat('ru-RU').format(new Date(quote.issued_at))} · действует до {new Intl.DateTimeFormat('ru-RU').format(new Date(quote.valid_until))}</small></div><div className="priceValue"><strong>{formatMinor(minorFromUnknown(quote.total_amount_minor), currency)}</strong><small><Link href={`/projects/${projectId}/quote/${quote.id}`} className="textLink">Открыть →</Link></small></div></article>; })}</div>}
        </section>
      </div>
    </div>
  </section>;
}
