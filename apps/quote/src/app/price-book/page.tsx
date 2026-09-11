import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { OPERATION_LABELS, type OperationKey } from '@/lib/engineering';
import { requireWorkspace } from '@/lib/workspace';
import { addPriceBookItem, deactivatePriceBookItem, importPriceBookCsv } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ setup?: string; error?: string; imported?: string; row?: string }> };

const categories: Array<[string,string]> = [
  ['board','Плита / задняя стенка'],['front','Фасад'],['edge','Кромка'],['hardware','Фурнитура'],['labour','Работа'],['operation','Операция'],
  ['worktop','Столешница'],['plinth','Цоколь'],['filler','Добор / фальшпанель'],['decor','Декоративная боковина'],
  ['delivery','Доставка'],['installation','Монтаж'],['other','Прочее'],
];
const categoryName = Object.fromEntries(categories);
const units: Array<[string,string]> = [['sheet','Лист'],['m2','м²'],['m','метр'],['pcs','штука'],['set','комплект'],['hour','час'],['job','заказ']];
const unitName = Object.fromEntries(units);

function formatMoney(value: number | string, currency: string) {
  return new Intl.NumberFormat('ru-RU', { style:'currency', currency }).format(Number(value) / 100);
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

const importErrors: Record<string,string> = {
  permission:'Недостаточно прав для изменения прайс-листа.', 'import-file':'Выберите CSV-файл.', 'import-size':'CSV слишком большой. Максимальный размер — 1,5 МБ.',
  'import-empty':'В CSV нет строк для импорта.', 'import-limit':'За один импорт можно загрузить не более 500 позиций.', 'import-header':'В CSV отсутствует обязательная колонка.',
  'import-row':'В одной из строк неверная категория, единица, название или цена.', 'import-price':'В одной из строк неверный формат цены.',
  'import-sheet':'Для позиции с единицей sheet нужны размеры листа.', 'import-operation':'Для категории operation нужен корректный operation_key.', 'import-write':'Не удалось записать импортированные позиции.',
};

export default async function PriceBookPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const [{ data: subscription }, { data: items, error }] = await Promise.all([
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_price_book_items').select('id, category, name, manufacturer, sku, unit, currency, purchase_price_minor, parameters_json, active').eq('organization_id', organization.id).eq('active', true).order('category').order('name'),
  ]);
  if (error) throw new Error(`Не удалось загрузить прайс-лист: ${error.message}`);
  const canManage = ['owner','admin'].includes(role);
  const errorMessage = query.error ? (importErrors[query.error] ?? 'Не удалось выполнить действие с позицией прайс-листа.') : '';

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">PRICE BOOK · MAKSTER QUOTE</span><h1>Прайс-лист мастерской</h1></div><Link href="/" className="textLink">← Главная</Link></header>
    <div className="pageContent">
      {query.setup === '1' ? <div className="notice success"><strong>Мастерская создана.</strong> Внесите реальные закупочные цены.</div> : null}
      {query.imported ? <div className="notice success"><strong>CSV импортирован.</strong> Добавлено позиций: {query.imported}.</div> : null}
      {query.error ? <div className="notice error">{errorMessage}{query.row ? ` Строка CSV: ${query.row}.` : ''}</div> : null}

      {canManage ? <section className="panel formPanel">
        <div className="panelHeader"><div><span className="eyebrow">БЫСТРЫЙ ИМПОРТ</span><h2>Загрузить CSV</h2></div></div>
        <form action={importPriceBookCsv} className="stackForm padded"><label>CSV-файл<input name="file" type="file" accept=".csv,text/csv,text/plain" required /></label><div className="engineNote"><strong>Обязательные колонки</strong><span>category, name, unit, price</span></div><button type="submit" className="secondary">Импортировать CSV</button></form>
      </section> : null}

      <div className="twoColumnPage">
        <section className="panel formPanel">
          <div className="panelHeader"><div><h2>Добавить цену</h2><p className="muted">Столешница и цоколь обычно задаются за метр; доборы и декоративные боковины — за м².</p></div></div>
          <form action={addPriceBookItem} className="stackForm padded">
            <div className="formGrid2"><label>Категория<select name="category" defaultValue="board">{categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Единица<select name="unit" defaultValue="sheet">{units.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
            <label>Название<input name="name" placeholder="Egger W980 ST2 18 мм" required /></label>
            <div className="formGrid2"><label>Производитель<input name="manufacturer" /></label><label>Артикул<input name="sku" /></label></div>
            <div className="formGrid2"><label>Закупочная цена, {organization.currency}<input name="price" inputMode="decimal" required /></label><label>Толщина, мм<input name="thicknessMm" type="number" min="0" step="0.1" /></label></div>
            <label>Тип операции<select name="operationKey" defaultValue=""><option value="">— не операция —</option>{Object.entries(OPERATION_LABELS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <div className="formGrid3"><label>Ширина листа, мм<input name="sheetWidthMm" type="number" min="1" /></label><label>Высота листа, мм<input name="sheetHeightMm" type="number" min="1" /></label><label>Запас / отход, %<input name="wastePct" type="number" min="0" step="0.1" defaultValue="8" /></label></div>
            <button className="primary" type="submit">Добавить в прайс-лист</button>
          </form>
        </section>
        <section className="panel"><div className="panelHeader"><div><span className="eyebrow">АКТИВНЫЕ ЦЕНЫ</span><h2>{items?.length ?? 0} позиций</h2></div></div>
          {!items?.length ? <div className="emptyState"><h3>Прайс-лист пока пуст</h3><p>Добавьте материалы, фурнитуру, операции и нужные отделочные элементы.</p></div> : <div className="priceList">{items.map((item) => <article className="priceRow" key={item.id}><div><span className="pill">{categoryName[item.category] ?? item.category}</span><strong>{item.name}</strong><small>{priceMeta(item)}</small></div><div className="priceValue"><strong>{formatMoney(item.purchase_price_minor, item.currency)}</strong><small>/ {unitName[item.unit] ?? item.unit}</small>{canManage ? <><Link className="textLink" href={`/price-book/${item.id}`}>Изменить</Link><form action={deactivatePriceBookItem}><input type="hidden" name="itemId" value={item.id}/><button type="submit" className="textLink">Убрать</button></form></> : null}</div></article>)}</div>}
        </section>
      </div>
    </div>
  </AppShell>;
}
