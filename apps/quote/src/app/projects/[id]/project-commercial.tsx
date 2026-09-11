import Link from 'next/link';
import { formatMinor } from '@/lib/calculation';
import {
  applySellingAdjustment,
  COMMERCIAL_VARIANT_LABELS,
  manualCostTotal,
  readCommercialOptions,
  type CommercialVariantKey,
} from '@/lib/project-commercial-options';
import { calculateMeasuredExtras, readMeasuredExtraSettings } from '@/lib/project-measured-extras';
import { calculateDepositMinor, calculateProjectPricing, minorFromUnknown, readProjectCommercialSettings, type StoredCabinetCost } from '@/lib/project-pricing';
import { saveProjectCommercial } from './commercial-actions';
import { addManualCostLine, removeManualCostLine } from './manual-cost-actions';
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
const variants: CommercialVariantKey[] = ['base', 'standard', 'premium'];

export function ProjectCommercial({ projectId, clientId, settings, clients, priceBook, cabinets, currency, targetMarginBps, overheadBps, role, quoteHistory, statusEvents }: Props) {
  const commercial = readProjectCommercialSettings(settings);
  const commercialOptions = readCommercialOptions(settings, targetMarginBps);
  const measuredSettings = readMeasuredExtraSettings(settings);
  const measured = calculateMeasuredExtras(measuredSettings, priceBook);
  const manualTotal = manualCostTotal(commercialOptions.manualCostLines);
  const commonExtras = {
    deliveryMinor: selectedJob(priceBook, commercial.deliveryItemId),
    installationMinor: selectedJob(priceBook, commercial.installationItemId),
    otherMinor: selectedJob(priceBook, commercial.otherItemId) + measured.totalMinor + manualTotal,
  };

  const pricingByVariant = Object.fromEntries(variants.map((variant) => {
    const basePricing = calculateProjectPricing(cabinets, commonExtras, {
      targetMarginBps: commercialOptions.variantMarginsBps[variant],
      overheadBps,
      taxBps: commercial.taxBps,
    });
    return [variant, {
      ...basePricing,
      adjusted: applySellingAdjustment(basePricing.pricing, commercial.taxBps, commercialOptions.adjustmentMode, commercialOptions.adjustmentBps),
    }];
  })) as Record<CommercialVariantKey, ReturnType<typeof calculateProjectPricing> & { adjusted: ReturnType<typeof applySellingAdjustment> }>;

  const selected = pricingByVariant[commercialOptions.selectedVariant];
  const quoteReady = selected.cabinetCount > 0 && selected.incompleteCabinets === 0 && measured.missing.length === 0;
  const canPublish = ['owner','admin','technologist'].includes(role);
  const depositMinor = calculateDepositMinor(selected.adjusted.grossSalesMinor, commercial.depositBps);
  const delivery = options(priceBook,'delivery','job');
  const installation = options(priceBook,'installation','job');
  const other = options(priceBook,'other','job');
  const worktops = options(priceBook,'worktop','m');
  const plinths = options(priceBook,'plinth','m');
  const fillers = options(priceBook,'filler','m2');
  const decor = options(priceBook,'decor','m2');
  const adjustmentLabel = commercialOptions.adjustmentMode === 'discount' ? 'скидка' : commercialOptions.adjustmentMode === 'surcharge' ? 'надбавка' : 'без корректировки';

  return <section className="pageContent compact"><div className="panel">
    <div className="panelHeader"><div><span className="eyebrow">ИТОГ ПРОЕКТА · MQ 0.1.12</span><h2>Коммерческий расчёт</h2></div><div className="topActions"><Link href={`/projects/${projectId}/quote`} className="secondary linkButton" target="_blank">Живой просмотр</Link>{canPublish ? <form action={publishCommercialQuote}><input type="hidden" name="projectId" value={projectId}/><button className="primary" type="submit" disabled={!quoteReady || !clientId}>Выпустить {COMMERCIAL_VARIANT_LABELS[commercialOptions.selectedVariant]}</button></form> : null}</div></div>
    <div className="padded">
      {!quoteReady ? <div className="notice warning"><strong>Предложение пока черновое.</strong> Модулей: {selected.cabinetCount}; неполных: {selected.incompleteCabinets}; отделочных позиций без цены: {measured.missing.length}.</div> : !clientId ? <div className="notice warning"><strong>Выберите и сохраните клиента.</strong></div> : <div className="notice success"><strong>Готово к выпуску.</strong> Будет зафиксирован вариант {COMMERCIAL_VARIANT_LABELS[commercialOptions.selectedVariant]} с маржой {(commercialOptions.variantMarginsBps[commercialOptions.selectedVariant]/100).toFixed(2)}% и коммерческой корректировкой «{adjustmentLabel}».</div>}

      <section className="metricGrid commercialMetrics">
        <article className="metricCard"><span>Прямая себестоимость</span><strong>{formatMinor(selected.pricing.directCostMinor,currency)}</strong><small>мебель + отделка + ручные позиции + услуги</small></article>
        <article className="metricCard"><span>Полная себестоимость</span><strong>{formatMinor(selected.pricing.trueCostMinor,currency)}</strong><small>накладные {(overheadBps/100).toFixed(2)}%</small></article>
        <article className="metricCard"><span>Цена до корректировки</span><strong>{formatMinor(selected.adjusted.listNetSalesMinor,currency)}</strong><small>вариант {COMMERCIAL_VARIANT_LABELS[commercialOptions.selectedVariant]}</small></article>
        <article className="metricCard"><span>К оплате</span><strong>{formatMinor(selected.adjusted.grossSalesMinor,currency)}</strong><small>{commercial.depositBps > 0 ? `аванс ${formatMinor(depositMinor,currency)}` : `фактическая маржа ${(selected.adjusted.marginBps/100).toFixed(2)}%`}</small></article>
      </section>

      <section className="metricGrid" style={{marginBottom:20}}>
        {variants.map((variant) => {
          const row = pricingByVariant[variant];
          const active = commercialOptions.selectedVariant === variant;
          return <article className="metricCard" key={variant} style={active ? {outline:'2px solid #1f7a5a'} : undefined}>
            <span>{active ? 'ВЫБРАННЫЙ ВАРИАНТ' : 'ЦЕНОВОЙ ВАРИАНТ'}</span>
            <strong>{COMMERCIAL_VARIANT_LABELS[variant]}</strong>
            <small>целевая маржа {(commercialOptions.variantMarginsBps[variant]/100).toFixed(2)}%</small>
            <div className="costRows" style={{padding:'10px 0 0'}}><div><span>Без НДС</span><strong>{formatMinor(row.adjusted.netSalesMinor,currency)}</strong></div><div><span>К оплате</span><strong>{formatMinor(row.adjusted.grossSalesMinor,currency)}</strong></div></div>
          </article>;
        })}
      </section>

      <form action={saveProjectCommercial} className="stackForm commercialForm"><input type="hidden" name="projectId" value={projectId}/>
        <div className="formSection"><h3>Ценовые варианты и скидка / надбавка</h3><p className="muted">Base / Standard / Premium сейчас отличаются коммерческой маржой при одинаковом составе мебели. Позже варианты смогут отличаться материалами и комплектацией.</p>
          <div className="formGrid3"><label>Base, маржа %<input name="baseMarginPercent" type="number" min="0" max="95" step="0.01" defaultValue={(commercialOptions.variantMarginsBps.base/100).toFixed(2)}/></label><label>Standard, маржа %<input name="standardMarginPercent" type="number" min="0" max="95" step="0.01" defaultValue={(commercialOptions.variantMarginsBps.standard/100).toFixed(2)}/></label><label>Premium, маржа %<input name="premiumMarginPercent" type="number" min="0" max="95" step="0.01" defaultValue={(commercialOptions.variantMarginsBps.premium/100).toFixed(2)}/></label></div>
          <div className="formGrid3"><label>Вариант для выпуска<select name="selectedVariant" defaultValue={commercialOptions.selectedVariant}><option value="base">Base</option><option value="standard">Standard</option><option value="premium">Premium</option></select></label><label>Коммерческая корректировка<select name="adjustmentMode" defaultValue={commercialOptions.adjustmentMode}><option value="none">Без корректировки</option><option value="discount">Скидка</option><option value="surcharge">Надбавка</option></select></label><label>Корректировка, %<input name="adjustmentPercent" type="number" min="0" max="50" step="0.01" defaultValue={(commercialOptions.adjustmentBps/100).toFixed(2)}/></label></div>
          {commercialOptions.adjustmentMode !== 'none' && commercialOptions.adjustmentBps > 0 ? <div className="engineNote"><strong>{commercialOptions.adjustmentMode === 'discount' ? 'Скидка' : 'Надбавка'} {(commercialOptions.adjustmentBps/100).toFixed(2)}%</strong><span>Изменение цены: {formatMinor(selected.adjusted.sellingAdjustmentMinor,currency)}. Фактическая маржа после корректировки: {(selected.adjusted.marginBps/100).toFixed(2)}%.</span></div> : null}
        </div>

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
        <div className="formActions"><Link href="/price-book" className="secondary linkButton">Прайс-лист</Link><button type="submit" className="primary">Сохранить условия и варианты</button></div>
      </form>

      <section style={{marginTop:28}}>
        <div className="panelHeader"><div><span className="eyebrow">РУЧНЫЕ ПОЗИЦИИ</span><h3>Нестандартные расходы</h3><p className="muted">Для разовых вещей, которых нет в Price Book: спецфурнитура, выезд, стекло, камень, субподряд и т. п. Указанная сумма считается себестоимостью и проходит через накладные и выбранную маржу.</p></div><strong>{formatMinor(manualTotal,currency)}</strong></div>
        {commercialOptions.manualCostLines.length ? <div className="priceList">{commercialOptions.manualCostLines.map((line) => <article className="priceRow" key={line.id}><div><span className="pill">РУЧНАЯ ПОЗИЦИЯ</span><strong>{line.name}</strong></div><div className="priceValue"><strong>{formatMinor(line.costMinor,currency)}</strong><form action={removeManualCostLine}><input type="hidden" name="projectId" value={projectId}/><input type="hidden" name="lineId" value={line.id}/><button className="textLink" type="submit">Убрать</button></form></div></article>)}</div> : <p className="muted">Ручных позиций пока нет.</p>}
        <form action={addManualCostLine} className="stackForm" style={{marginTop:14}}><input type="hidden" name="projectId" value={projectId}/><div className="formGrid2"><label>Название<input name="manualName" maxLength={200} placeholder="Например: стеклянная витрина на заказ" required/></label><label>Себестоимость, {currency}<input name="manualCost" inputMode="decimal" placeholder="2500,00" required/></label></div><div className="formActions"><button className="secondary" type="submit">+ Добавить ручную позицию</button></div></form>
      </section>

      <section style={{marginTop:32}}><div className="panelHeader"><div><span className="eyebrow">ИСТОРИЯ ПРЕДЛОЖЕНИЙ</span><h3>{quoteHistory.length ? `${quoteHistory.length} выпущенных версий` : 'Версий пока нет'}</h3></div></div>
        {!quoteHistory.length ? <p className="muted">После выпуска здесь появится неизменяемый snapshot.</p> : <div className="priceList">{quoteHistory.map((quote) => { const status = latestStatus(quote.id,statusEvents); return <article className="priceRow" key={quote.id}><div><span className="pill">v{quote.quote_version} · {statusName[status] ?? status}</span><strong>{quote.client_name}</strong><small>{new Intl.DateTimeFormat('ru-RU').format(new Date(quote.issued_at))} · до {new Intl.DateTimeFormat('ru-RU').format(new Date(quote.valid_until))}</small></div><div className="priceValue"><strong>{formatMinor(minorFromUnknown(quote.total_amount_minor),currency)}</strong><small><Link href={`/projects/${projectId}/quote/${quote.id}`} className="textLink">Открыть →</Link></small></div></article>; })}</div>}
      </section>
    </div>
  </div></section>;
}
