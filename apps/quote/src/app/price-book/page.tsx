import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { INTL_LOCALES, type Locale } from '@/lib/i18n';
import { getPriceBookMessages, priceBookCategoryLabels, priceBookOperationLabels, priceBookUnitLabels } from '@/lib/i18n-price-book';
import { requireWorkspace } from '@/lib/workspace';
import { addPriceBookItem, deactivatePriceBookItem, importPriceBookCsv } from './actions';

export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ setup?: string; error?: string; imported?: string; row?: string }> };
const currencies = ['CZK','EUR','PLN','USD'];
const operationKeys = ['cutting','edge-banding','carcass-drilling','hinge-cup','drawer-drilling','back-groove'] as const;
const hardwareRoleLabels:Record<Locale,{title:string;none:string;cargo:string;lift:string;corner:string;help:string}>={
  ru:{title:'Тип специальной фурнитуры',none:'Обычная фурнитура',cargo:'Cargo / бутылочница',lift:'Lift-Up / Aventos',corner:'LeMans / Magic Corner',help:'Выбирайте только для механизмов, которые Makster должен считать отдельной комплектной позицией.'},
  en:{title:'Special hardware type',none:'Standard hardware',cargo:'Cargo / bottle pull-out',lift:'Lift-Up / Aventos',corner:'LeMans / Magic Corner',help:'Use this only for mechanisms Makster should cost as a separate hardware set.'},
  cs:{title:'Typ speciálního kování',none:'Běžné kování',cargo:'Cargo / výsuv',lift:'Lift-Up / Aventos',corner:'LeMans / Magic Corner',help:'Použijte jen pro mechanismy, které má Makster počítat jako samostatnou sadu kování.'},
  de:{title:'Spezialbeschlag-Typ',none:'Standardbeschlag',cargo:'Cargo / Flaschenauszug',lift:'Lift-Up / Aventos',corner:'LeMans / Magic Corner',help:'Nur für Mechanismen verwenden, die Makster als separate Beschlagposition kalkulieren soll.'},
  pl:{title:'Typ okucia specjalnego',none:'Standardowe okucie',cargo:'Cargo / wysuw',lift:'Lift-Up / Aventos',corner:'LeMans / Magic Corner',help:'Używaj tylko dla mechanizmów liczonych przez Makster jako osobny komplet okuć.'},
};

function formatMoney(value: number | string, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style:'currency', currency }).format(Number(value) / 100);
}

function priceMeta(item: { manufacturer: string | null; sku: string | null; parameters_json: unknown }, operationLabels: Record<string,string>, manualPrice: string, roleLabels:{cargo:string;lift:string;corner:string}) {
  const params = (item.parameters_json ?? {}) as Record<string, unknown>;
  const operationKey = typeof params.operationKey === 'string' ? params.operationKey : null;
  const hardwareRole = typeof params.hardwareRole === 'string' ? params.hardwareRole : null;
  const thickness = Number(params.thicknessMm ?? 0);
  const details = [item.manufacturer, item.sku].filter(Boolean) as string[];
  if (thickness > 0) details.push(`${thickness} mm`);
  if (operationKey && operationLabels[operationKey]) details.push(operationLabels[operationKey]);
  if (hardwareRole && hardwareRole in roleLabels) details.push(roleLabels[hardwareRole as keyof typeof roleLabels]);
  return details.join(' · ') || manualPrice;
}

export default async function PriceBookPage({ searchParams }: Props) {
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const locale = await getInterfaceLocale();
  const m = getPriceBookMessages(locale);
  const hw = hardwareRoleLabels[locale];
  const categoryName = priceBookCategoryLabels(locale);
  const unitName = priceBookUnitLabels(locale);
  const operationName = priceBookOperationLabels(locale);
  const categories = Object.entries(categoryName);
  const units = Object.entries(unitName);
  const importErrors: Record<string,string> = {
    permission:m.errorPermission, 'import-file':m.errorImportFile, 'import-size':m.errorImportSize,
    'import-empty':m.errorImportEmpty, 'import-limit':m.errorImportLimit, 'import-header':m.errorImportHeader,
    'import-row':m.errorImportRow, 'import-price':m.errorImportPrice, 'import-sheet':m.errorImportSheet,
    'import-operation':m.errorImportOperation, 'import-write':m.errorImportWrite,
    'hardware-role':m.genericError,'hardware-unit':m.genericError,
  };

  const [{ data: subscription }, { data: items, error }] = await Promise.all([
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_price_book_items').select('id, category, name, manufacturer, sku, unit, currency, purchase_price_minor, parameters_json, active').eq('organization_id', organization.id).eq('active', true).order('currency').order('category').order('name'),
  ]);
  if (error) throw new Error(`Failed to load Price Book: ${error.message}`);
  const canManage = ['owner','admin'].includes(role);
  const errorMessage = query.error ? (importErrors[query.error] ?? m.genericError) : '';

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">PRICE BOOK · MAKSTER QUOTE</span><h1>{m.title}</h1></div><Link href="/dashboard" className="textLink">{m.back}</Link></header>
    <div className="pageContent">
      {query.setup === '1' ? <div className="notice success"><strong>{m.setupSuccess}</strong></div> : null}
      {query.imported ? <div className="notice success"><strong>{m.importedSuccess}</strong> {m.importedCount}: {query.imported}.</div> : null}
      {query.error ? <div className="notice error">{errorMessage}{query.row ? ` ${m.csvRow}: ${query.row}.` : ''}</div> : null}
      <div className="notice warning"><strong>{m.currencyGuardTitle}</strong> {m.currencyGuardText}</div>

      {canManage ? <section className="panel formPanel">
        <div className="panelHeader"><div><span className="eyebrow">{m.quickImport}</span><h2>{m.uploadCsv}</h2></div></div>
        <form action={importPriceBookCsv} className="stackForm padded"><label>{m.csvFile}<input name="file" type="file" accept=".csv,text/csv,text/plain" required /></label><div className="engineNote"><strong>{m.requiredColumns}</strong><span>category, name, unit, price</span><span>{m.optionalCurrency} ({organization.currency}) · optional: hardwareRole = cargo / lift / corner</span></div><button type="submit" className="secondary">{m.importButton}</button></form>
      </section> : null}

      <div className="twoColumnPage">
        <section className="panel formPanel">
          <div className="panelHeader"><div><h2>{m.addPrice}</h2><p className="muted">{m.addPriceHelp}</p></div></div>
          <form action={addPriceBookItem} className="stackForm padded">
            <div className="formGrid3"><label>{m.category}<select name="category" defaultValue="board">{categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>{m.unit}<select name="unit" defaultValue="sheet">{units.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>{m.currency}<select name="currency" defaultValue={organization.currency}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label></div>
            <label>{m.name}<input name="name" placeholder="Egger W980 ST2 18 mm" required /></label>
            <div className="formGrid2"><label>{m.manufacturer}<input name="manufacturer" /></label><label>{m.sku}<input name="sku" /></label></div>
            <div className="formGrid2"><label>{m.purchasePrice}<input name="price" inputMode="decimal" required /></label><label>{m.thickness}<input name="thicknessMm" type="number" min="0" step="0.1" /></label></div>
            <label>{hw.title}<select name="hardwareRole" defaultValue=""><option value="">{hw.none}</option><option value="cargo">{hw.cargo}</option><option value="lift">{hw.lift}</option><option value="corner">{hw.corner}</option></select><small>{hw.help}</small></label>
            <label>{m.operationType}<select name="operationKey" defaultValue=""><option value="">{m.notOperation}</option>{operationKeys.map((key) => <option key={key} value={key}>{operationName[key]}</option>)}</select></label>
            <div className="formGrid3"><label>{m.sheetWidth}<input name="sheetWidthMm" type="number" min="1" /></label><label>{m.sheetHeight}<input name="sheetHeightMm" type="number" min="1" /></label><label>{m.waste}<input name="wastePct" type="number" min="0" step="0.1" defaultValue="8" /></label></div>
            <button className="primary" type="submit">{m.addToPriceBook}</button>
          </form>
        </section>
        <section className="panel"><div className="panelHeader"><div><span className="eyebrow">{m.activePrices}</span><h2>{items?.length ?? 0}</h2></div></div>
          {!items?.length ? <div className="emptyState"><h3>{m.emptyTitle}</h3><p>{m.emptyText}</p></div> : <div className="priceList">{items.map((item) => <article className="priceRow" key={item.id}><div><span className="pill">{item.currency} · {categoryName[item.category as keyof typeof categoryName] ?? item.category}</span><strong>{item.name}</strong><small>{priceMeta(item, operationName, m.manualPrice, hw)}</small></div><div className="priceValue"><strong>{formatMoney(item.purchase_price_minor, item.currency, INTL_LOCALES[locale])}</strong><small>/ {unitName[item.unit as keyof typeof unitName] ?? item.unit}</small>{canManage ? <><Link className="textLink" href={`/price-book/${item.id}`}>{m.edit}</Link><form action={deactivatePriceBookItem}><input type="hidden" name="itemId" value={item.id}/><button type="submit" className="textLink">{m.remove}</button></form></> : null}</div></article>)}</div>}
        </section>
      </div>
    </div>
  </AppShell>;
}
