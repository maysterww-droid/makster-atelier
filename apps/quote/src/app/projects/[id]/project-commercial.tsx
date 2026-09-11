import Link from 'next/link';
import { formatMinor } from '@/lib/calculation';
import { calculateMeasuredExtras, readMeasuredExtraSettings } from '@/lib/project-measured-extras';
import { calculateDepositMinor, calculateProjectPricing, minorFromUnknown, readProjectCommercialSettings, type StoredCabinetCost } from '@/lib/project-pricing';
import { saveProjectCommercial } from './commercial-actions';
import { publishCommercialQuote } from './publish-actions';

type ClientRow = { id:string; display_name:string; email:string|null; phone:string|null };
type PriceRow = { id:string; category:string; name:string; unit:string; purchase_price_minor:number|string };
type QuoteRow = { id:string; quote_version:number; issued_at:string; valid_until:string; total_amount_minor:number|string; client_name:string };
type StatusRow = { quote_id:string; status:string; created_at:string; note:string|null };
type Props = { projectId:string; clientId:string|null; settings:Record<string,unknown>|null; clients:ClientRow[]; priceBook:PriceRow[]; cabinets:StoredCabinetCost[]; currency:string; targetMarginBps:number; overheadBps:number; role:string; quoteHistory:QuoteRow[]; statusEvents:StatusRow[] };

function selectedJob(items: PriceRow[], id: string) {
  const item = items.find((row) => row.id === id && row.unit === 'job');
  return minorFromUnknown(item?.purchase_price_minor);
}
function options(items: PriceRow[], category: string, unit: string) { return items.filter((item) => item.category === category && item.unit === unit); }
function moneyOption(item: PriceRow, currency: string) { return `${item.name} · ${formatMinor(minorFromUnknown(item.purchase_price_minor), currency)}/${item.unit === 'm2' ? 'м²' : item.unit === 'm' ? 'м' : 'заказ'}`; }
const statusName: Record<string,string> = { draft:'Черновик', approved:'Выпущено', sent:'Отправлено', accepted:'Принято', rejected:'Отклонено', expired:'Истекло', superseded:'Заменено' };
function latestStatus(id:string, events:StatusRow[]) { return events.find((event) => event.quote_id === id)?.status ?? 'approved'; }

export function ProjectCommercial({ projectId, clientId, settings, clients, priceBook, cabinets, currency, targetMarginBps, overheadBps, role, quoteHistory, statusEvents }: Props) {
  const commercial = readProjectCommercialSettings(settings);
  const measuredSettings = readMeasuredExtraSettings(settings);
  const measured = calculateMeasuredExtras(measuredSettings, priceBook);
  const pricing = calculateProjectPricing(cabinets, {
    deliveryMinor: selectedJob(priceBook, commercial.deliveryItemId),
    installationMinor: selectedJob(priceBook, commercial.installationItemId),
    otherMinor: selectedJob(priceBook, commercial.otherItemId) + measured.totalMinor,
  }, { targetMarginBps, overheadBps, taxBps: commercial.taxBps });

  const quoteReady = pricing.cabinetCount > 0 && pricing.incompleteCabinets === 0 && measured.missing.length === 0;
  const canPublish = ['owner','admin','technologist'].includes(role);
  const depositMinor = calculateDepositMinor(pricing.pricing.grossSalesMinor, commercial.depositBps);
  const delivery = options(priceBook,'delivery','job');
  const installation = options(priceBook,'installation','job');
  const other = options(priceBook,'other','job');
  const worktops = options(priceBook,'worktop','m');
  const plinths = options(priceBook,'plinth','m');
  const fillers = options(priceBook,'filler','m2');
  const decor = options(priceBook,'decor','m2');

  return <section className="pageContent compact"><div className="panel">
    <div className="panelHeader"><div><span className="eyebrow">ИТОГ ПРОЕКТА · MQ 0.1.11</span><h2>Коммерческий расчёт</h2></div><div className="topActions"><Link href={`/projects/${projectId}/quote`} className="secondary linkButton" target="_blank">Живой просмотр</Link>{canPublish ? <form action={publishCommercialQuote}><input type="hidden" name="projectId" value={projectId}/><button className="primary" type="submit" disabled={!quoteReady || !clientId}>Выпустить версию</button></form> : null}</div></div>
    <div className="padded">
      {!quoteReady ? <div className="notice warning"><strong>Предложение пока черновое.</strong> Модулей: {pricing.cabinetCount}; неполных: {pricing.incompleteCabinets}; отделочных позиций без цены: {measured.missing.length}.</div> : !clientId ? <div className="notice warning"><strong>Выберите и сохраните клиента.</strong></div> : <div className="notice success"><strong>Готово к выпуску.</strong> Модули, отделка, услуги, цена и условия будут зафиксированы в snapshot.</div>}
      <section className="metricGrid commercialMetrics">
        <article className="metricCard"><span>Прямая себестоимость</span><strong>{formatMinor(pricing.pricing.directCostMinor,currency)}</strong><small>мебель + отделка + услуги</small></article>
        <article className="metricCard"><span>Полная себестоимость</span><strong>{formatMinor(pricing.pricing.trueCostMinor,currency)}</strong><small>накладные {(overheadBps/100).toFixed(2)}%</small></article>
        <article className="metricCard"><span>Цена без НДС</span><strong>{formatMinor(pricing.pricing.netSalesMinor,currency)}</strong><small>маржа {(targetMarginBps/100).toFixed(2)}%</small></article>
        <article className="metricCard"><span>К оплате</span><strong>{formatMinor(pricing.pricing.grossSalesMinor,currency)}</strong><small>{commercial.depositBps > 0 ? `аванс ${formatMinor(depositMinor,currency)}` : `налог ${(commercial.taxBps/100).toFixed(2)}%`}</small></article>
      </section>

      <form action={saveProjectCommercial} className="stackForm commercialForm"><input type="hidden" name="projectId" value={projectId}/>
        <div className="formGrid3"><label>Клиент<select name="clientId" defaultValue={clientId ?? ''}><option value="">— не выбран —</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.display_name}</option>)}</select></label><label>НДС / налог, %<input name="taxPercent" type="number" min="0" max="1000" step="0.01" defaultValue={(commercial.taxBps/100).toFixed(2)}/></label><label>Действует, дней<input name="validityDays" type="number" min="1" max="365" defaultValue={commercial.validityDays}/></label></div>

        <div className="formSection"><h3>Столешница, цоколь и отделка</h3><p className="muted">Укажите фактическую суммарную длину/площадь проекта. Это коммерческий расчёт; раскрой и стыки столешницы остаются отдельным производственным этапом.</p>
          <div className="formGrid2"><label>Столешница<select name="worktopItemId" defaultValue={measuredSettings.worktopItemId}><option value="">— не учитывать —</option>{worktops.map((item) => <option key={item.id} value={item.id}>{moneyOption(item,currency)}</option>)}</select></label><label>Длина столешницы, м<input name="worktopLengthM" type="number" min="0" step="0.01" defaultValue={measuredSettings.worktopLengthM}/></label></div>
          <div className="formGrid2"><label>Цоколь<select name="plinthItemId" defaultValue={measuredSettings.plinthItemId}><option value="">— не учитывать —</option>{plinths.map((item) => <option key={item.id} value={item.id}>{moneyOption(item,currency)}</option>)}</select></label><label>Длина цоколя, м<input name="plinthLengthM" type="number" min="0" step="0.01" defaultValue={measuredSettings.plinthLengthM}/></label></div>
          <div className="formGrid2"><label>Доборы / фальшпанели<select name="fillerItemId" defaultValue={measuredSettings.fillerItemId}><option value="">— не учитывать —</option>{fillers.map((item) => <option key={item.id} value={item.id}>{moneyOption(item,currency)}</option>)}</select></label><label>Площадь доборов, м²<input name="fillerAreaM2" type="number" min="0" step="0.01" defaultValue={measuredSettings.fillerAreaM2}/></label></div>
          <div className="formGrid2"><label>Декоративные боковины<select name="decorItemId" defaultValue={measuredSettings.decorItemId}><option value="">— не учитывать —</option>{decor.map((item) => <option key={item.id} value={item.id}>{moneyOption(item,currency)}</option>)}</select></label><label>Площадь боковин, м²<input name="decorAreaM2" type="number" min="0" step="0.01" defaultValue={measuredSettings.decorAreaM2}/></label></div>
          {measured.lines.length ? <div className="engineNote"><strong>Отделка в себестоимости: {formatMinor(measured.totalMinor,currency)}</strong>{measured.lines.map((line) => <span key={line.category}>{line.name}: {line.quantity.toFixed(2)} {line.unit === 'm2' ? 'м²' : 'м'} · {formatMinor(line.amountMinor,currency)}</span>)}</div> : null}
        </div>

        <div className="formGrid3"><label>Доставка<select name="deliveryItemId" defaultValue={commercial.deliveryItemId}><option value="">— не учитывать —</option>{delivery.map((item) => <option key={item.id} value={item.id}>{moneyOption(item,currency)}</option>)}</select></label><label>Монтаж<select name="installationItemId" defaultValue={commercial.installationItemId}><option value="">— не учитывать —</option>{installation.map((item) => <option key={item.id} value={item.id}>{moneyOption(item,currency)}</option>)}</select></label><label>Прочие расходы<select name="otherItemId" defaultValue={commercial.otherItemId}><option value="">— не учитывать —</option>{other.map((item) => <option key={item.id} value={item.id}>{moneyOption(item,currency)}</option>)}</select></label></div>
        <div className="formGrid3"><label>Язык документа<select name="documentLocale" defaultValue={commercial.documentLocale}><option value="ru">Русский</option><option value="cs">Čeština</option><option value="de">Deutsch</option><option value="pl">Polski</option><option value="en">English</option></select></label><label>Аванс, %<input name="depositPercent" type="number" min="0" max="100" step="0.01" defaultValue={(commercial.depositBps/100).toFixed(2)}/></label><label>Срок изготовления<input name="productionLeadText" defaultValue={commercial.productionLeadText}/></label></div>
        <div className="formGrid2"><label>Условия оплаты<textarea name="paymentTerms" rows={3} defaultValue={commercial.paymentTerms}/></label><label>Гарантия / условия<textarea name="warrantyText" rows={3} defaultValue={commercial.warrantyText}/></label></div>
        <div className="formGrid3"><label>Новый клиент — имя<input name="newClientName"/></label><label>Новый клиент — email<input name="newClientEmail" type="email"/></label><label>Новый клиент — телефон<input name="newClientPhone"/></label></div>
        <div className="formGrid2"><label>Новый клиент — адрес<input name="newClientAddress"/></label><label>Комментарий для клиента<textarea name="clientNote" rows={3} defaultValue={commercial.clientNote}/></label></div>
        <div className="formActions"><Link href="/price-book" className="secondary linkButton">Прайс-лист</Link><button type="submit" className="primary">Сохранить условия</button></div>
      </form>

      <section style={{marginTop:32}}><div className="panelHeader"><div><span className="eyebrow">ИСТОРИЯ ПРЕДЛОЖЕНИЙ</span><h3>{quoteHistory.length ? `${quoteHistory.length} выпущенных версий` : 'Версий пока нет'}</h3></div></div>
        {!quoteHistory.length ? <p className="muted">После выпуска здесь появится неизменяемый snapshot.</p> : <div className="priceList">{quoteHistory.map((quote) => { const status = latestStatus(quote.id,statusEvents); return <article className="priceRow" key={quote.id}><div><span className="pill">v{quote.quote_version} · {statusName[status] ?? status}</span><strong>{quote.client_name}</strong><small>{new Intl.DateTimeFormat('ru-RU').format(new Date(quote.issued_at))} · до {new Intl.DateTimeFormat('ru-RU').format(new Date(quote.valid_until))}</small></div><div className="priceValue"><strong>{formatMinor(minorFromUnknown(quote.total_amount_minor),currency)}</strong><small><Link href={`/projects/${projectId}/quote/${quote.id}`} className="textLink">Открыть →</Link></small></div></article>; })}</div>}
      </section>
    </div>
  </div></section>;
}
