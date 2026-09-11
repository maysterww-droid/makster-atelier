import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { OPERATION_LABELS, type OperationKey } from '@/lib/engineering';
import { requireWorkspace } from '@/lib/workspace';
import { addPriceBookItem } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ setup?: string; error?: string }> };

const categoryName: Record<string, string> = { board: 'Плита', front: 'Фасад', edge: 'Кромка', hardware: 'Фурнитура', operation: 'Операция', labour: 'Работа', delivery: 'Доставка', installation: 'Монтаж', overhead: 'Накладные', other: 'Другое' };
const unitName: Record<string, string> = { sheet: 'лист', m2: 'м²', m: 'м', pcs: 'шт', set: 'компл.', hour: 'час', job: 'заказ' };

function formatMoney(value: number | string, currency: string) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(Number(value) / 100);
}

function priceMeta(item: { manufacturer: string | null; sku: string | null; parameters_json: unknown }) {
  const params = (item.parameters_json ?? {}) as Record<string, unknown>;
  const operationKey = typeof params.operationKey === 'string' ? params.operationKey as OperationKey : null;
  const thickness = Number(params.thicknessMm ?? 0);
  const details = [item.manufacturer, item.sku].filter(Boolean) as string[];
  if (thickness > 0) details.push(`${thickness} мм`);
  if (operationKey && OPERATION_LABELS[operationKey]) details.push(OPERATION_LABELS[operationKey]);
  return details.join(' · ') || 'ручная цена';
}

export default async function PriceBookPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const [{ data: subscription }, { data: items, error }] = await Promise.all([
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_price_book_items').select('id, category, name, manufacturer, sku, unit, currency, purchase_price_minor, parameters_json, active').eq('organization_id', organization.id).eq('active', true).order('category').order('name'),
  ]);
  if (error) throw new Error(`Не удалось загрузить прайс-лист: ${error.message}`);

  return (
    <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
      <header className="topbar"><div><span className="eyebrow">PRICE BOOK · ENGINEERING 0.1.2</span><h1>Прайс-лист мастерской</h1></div><Link href="/" className="textLink">← Главная</Link></header>
      <div className="pageContent">
        {query.setup === '1' ? <div className="notice success"><strong>Мастерская создана.</strong> Теперь внесите реальные закупочные цены. Makster не будет подставлять демонстрационные стоимости в рабочие проекты.</div> : null}
        {query.error ? <div className="notice error">Не удалось сохранить позицию. Для операции обязательно выберите её тип; для листа укажите размеры.</div> : null}
        <div className="twoColumnPage">
          <section className="panel formPanel">
            <div className="panelHeader"><div><h2>Добавить цену</h2><p className="muted">Операции типизируются один раз здесь, а потом Makster автоматически применяет их к деталировке.</p></div></div>
            <form action={addPriceBookItem} className="stackForm padded">
              <div className="formGrid2"><label>Категория<select name="category" defaultValue="board"><option value="board">Плита / задняя стенка</option><option value="front">Фасад</option><option value="edge">Кромка</option><option value="hardware">Фурнитура</option><option value="labour">Работа</option><option value="operation">Операция</option><option value="delivery">Доставка</option><option value="installation">Монтаж</option></select></label><label>Единица<select name="unit" defaultValue="sheet"><option value="sheet">Лист</option><option value="m2">м²</option><option value="m">метр</option><option value="pcs">штука</option><option value="set">комплект</option><option value="hour">час</option><option value="job">заказ</option></select></label></div>
              <label>Название<input name="name" placeholder="Egger W980 ST2 18 мм" required /></label>
              <div className="formGrid2"><label>Производитель<input name="manufacturer" placeholder="Egger" /></label><label>Артикул<input name="sku" /></label></div>
              <div className="formGrid2"><label>Закупочная цена, {organization.currency}<input name="price" inputMode="decimal" placeholder="82,40" required /></label><label>Толщина материала, мм<input name="thicknessMm" type="number" min="0" step="0.1" placeholder="18" /></label></div>
              <label>Тип операции — заполняется только для категории «Операция»<select name="operationKey" defaultValue=""><option value="">— не операция —</option>{Object.entries(OPERATION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <div className="formGrid3"><label>Ширина листа, мм<input name="sheetWidthMm" type="number" min="1" placeholder="2800" /></label><label>Высота листа, мм<input name="sheetHeightMm" type="number" min="1" placeholder="2070" /></label><label>Запас / отход, %<input name="wastePct" type="number" min="0" step="0.1" defaultValue="8" /></label></div>
              <div className="engineNote"><strong>Как задавать операции</strong><span>Раскрой и присадка — обычно за деталь/штуку; кромление и паз — за метр. Если поставщик считает операцию фиксировано на модуль, используйте единицу «заказ».</span></div>
              <button className="primary" type="submit">Добавить в прайс-лист</button>
            </form>
          </section>
          <section className="panel">
            <div className="panelHeader"><div><span className="eyebrow">АКТИВНЫЕ ЦЕНЫ</span><h2>{items?.length ?? 0} позиций</h2></div></div>
            {!items?.length ? <div className="emptyState"><h3>Прайс-лист пока пуст</h3><p>Для полного Engineering 0.1.2 добавьте корпус, фасад, HDF/ДВП для задней стенки, кромку, петли или ящики, а также производственные операции.</p></div> : <div className="priceList">{items.map((item) => <article className="priceRow" key={item.id}><div><span className="pill">{categoryName[item.category] ?? item.category}</span><strong>{item.name}</strong><small>{priceMeta(item)}</small></div><div className="priceValue"><strong>{formatMoney(item.purchase_price_minor, item.currency)}</strong><small>/ {unitName[item.unit] ?? item.unit}</small></div></article>)}</div>}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
