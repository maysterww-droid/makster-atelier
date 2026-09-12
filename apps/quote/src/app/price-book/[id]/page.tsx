import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { OPERATION_LABELS } from '@/lib/engineering';
import { requireWorkspace } from '@/lib/workspace';
import { updatePriceBookItem } from '../actions';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };
const categories: Array<[string,string]> = [
  ['board','Плита / задняя стенка'],['front','Фасад'],['edge','Кромка'],['hardware','Фурнитура'],['labour','Работа'],['operation','Операция'],
  ['worktop','Столешница'],['plinth','Цоколь'],['filler','Добор / фальшпанель'],['decor','Декоративная боковина'],['delivery','Доставка'],['installation','Монтаж'],['overhead','Накладные'],['other','Прочее'],
];
const units: Array<[string,string]> = [['sheet','Лист'],['m2','м²'],['m','метр'],['pcs','штука'],['set','комплект'],['hour','час'],['job','заказ']];
const currencies = ['CZK','EUR','PLN','USD'];

function priceInput(value: number | string) {
  const minor = Number(value);
  return Number.isFinite(minor) ? (minor / 100).toFixed(2) : '0.00';
}

export default async function EditPriceBookItemPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const [{ data: item, error }, { data: subscription }] = await Promise.all([
    supabase.from('quote_price_book_items').select('id, category, name, manufacturer, sku, unit, currency, purchase_price_minor, parameters_json, active').eq('id', id).eq('organization_id', organization.id).eq('active', true).maybeSingle(),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
  ]);
  if (error || !item) notFound();
  const canManage = ['owner','admin'].includes(role);
  const parameters = (item.parameters_json ?? {}) as Record<string, unknown>;

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">PRICE BOOK · EDIT</span><h1>Изменить цену</h1></div><Link href="/price-book" className="textLink">← Прайс-лист</Link></header>
    <div className="pageContent narrow">
      {query.error ? <div className="notice error">Не удалось сохранить изменения ({query.error}). Проверьте данные.</div> : null}
      {!canManage ? <div className="notice warning">Редактировать прайс-лист могут только владелец и администратор.</div> : null}
      <section className="panel formPanel"><div className="panelHeader"><div><h2>{item.name}</h2><p className="muted">Изменение цены или валюты влияет только на будущие расчёты и текущие черновики. Выпущенные предложения остаются неизменными.</p></div></div>
        {canManage ? <form action={updatePriceBookItem} className="stackForm padded">
          <input type="hidden" name="itemId" value={item.id}/>
          <div className="formGrid3"><label>Категория<select name="category" defaultValue={item.category}>{categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Единица<select name="unit" defaultValue={item.unit}>{units.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Валюта<select name="currency" defaultValue={item.currency}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label></div>
          <label>Название<input name="name" defaultValue={item.name} required /></label>
          <div className="formGrid2"><label>Производитель<input name="manufacturer" defaultValue={item.manufacturer ?? ''} /></label><label>Артикул<input name="sku" defaultValue={item.sku ?? ''} /></label></div>
          <div className="formGrid2"><label>Закупочная цена<input name="price" inputMode="decimal" defaultValue={priceInput(item.purchase_price_minor)} required /></label><label>Толщина, мм<input name="thicknessMm" type="number" min="0" step="0.1" defaultValue={Number(parameters.thicknessMm ?? 0) || ''} /></label></div>
          <label>Тип операции<select name="operationKey" defaultValue={typeof parameters.operationKey === 'string' ? parameters.operationKey : ''}><option value="">— не операция —</option>{Object.entries(OPERATION_LABELS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <div className="formGrid3"><label>Ширина листа, мм<input name="sheetWidthMm" type="number" min="1" defaultValue={Number(parameters.sheetWidthMm ?? 0) || ''} /></label><label>Высота листа, мм<input name="sheetHeightMm" type="number" min="1" defaultValue={Number(parameters.sheetHeightMm ?? 0) || ''} /></label><label>Запас / отход, %<input name="wastePct" type="number" min="0" step="0.1" defaultValue={Number(parameters.wastePct ?? 0)} /></label></div>
          <div className="formActions"><Link href="/price-book" className="secondary linkButton">Отмена</Link><button type="submit" className="primary">Сохранить изменения</button></div>
        </form> : null}
      </section>
    </div>
  </AppShell>;
}
