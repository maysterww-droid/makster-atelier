import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getInterfaceLocale } from '@/lib/interface-locale';
import { getPriceBookMessages, priceBookCategoryLabels, priceBookOperationLabels, priceBookUnitLabels } from '@/lib/i18n-price-book';
import { requireWorkspace } from '@/lib/workspace';
import { updatePriceBookItem } from '../actions';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };
const currencies = ['CZK','EUR','PLN','USD'];
const operationKeys = ['cutting','edge-banding','carcass-drilling','hinge-cup','drawer-drilling','back-groove'] as const;

function priceInput(value: number | string) {
  const minor = Number(value);
  return Number.isFinite(minor) ? (minor / 100).toFixed(2) : '0.00';
}

export default async function EditPriceBookItemPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, organization, role } = await requireWorkspace();
  const locale = await getInterfaceLocale();
  const m = getPriceBookMessages(locale);
  const categories = Object.entries(priceBookCategoryLabels(locale));
  const units = Object.entries(priceBookUnitLabels(locale));
  const operations = priceBookOperationLabels(locale);
  const [{ data: item, error }, { data: subscription }] = await Promise.all([
    supabase.from('quote_price_book_items').select('id, category, name, manufacturer, sku, unit, currency, purchase_price_minor, parameters_json, active').eq('id', id).eq('organization_id', organization.id).eq('active', true).maybeSingle(),
    supabase.from('quote_subscriptions').select('plan').eq('organization_id', organization.id).maybeSingle(),
  ]);
  if (error || !item) notFound();
  const canManage = ['owner','admin'].includes(role);
  const parameters = (item.parameters_json ?? {}) as Record<string, unknown>;

  return <AppShell organizationName={organization.name} role={role} plan={(subscription?.plan ?? 'free').toUpperCase()}>
    <header className="topbar"><div><span className="eyebrow">PRICE BOOK · EDIT</span><h1>{m.editTitle}</h1></div><Link href="/price-book" className="textLink">← {m.title}</Link></header>
    <div className="pageContent narrow">
      {query.error ? <div className="notice error">{m.genericError} ({query.error})</div> : null}
      {!canManage ? <div className="notice warning">{m.editPermission}</div> : null}
      <section className="panel formPanel"><div className="panelHeader"><div><h2>{item.name}</h2><p className="muted">{m.editHelp}</p></div></div>
        {canManage ? <form action={updatePriceBookItem} className="stackForm padded">
          <input type="hidden" name="itemId" value={item.id}/>
          <input type="hidden" name="hardwareRole" value={typeof parameters.hardwareRole === 'string' ? parameters.hardwareRole : ''}/>
          <div className="formGrid3"><label>{m.category}<select name="category" defaultValue={item.category}>{categories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>{m.unit}<select name="unit" defaultValue={item.unit}>{units.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>{m.currency}<select name="currency" defaultValue={item.currency}>{currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label></div>
          <label>{m.name}<input name="name" defaultValue={item.name} required /></label>
          <div className="formGrid2"><label>{m.manufacturer}<input name="manufacturer" defaultValue={item.manufacturer ?? ''} /></label><label>{m.sku}<input name="sku" defaultValue={item.sku ?? ''} /></label></div>
          <div className="formGrid2"><label>{m.purchasePrice}<input name="price" inputMode="decimal" defaultValue={priceInput(item.purchase_price_minor)} required /></label><label>{m.thickness}<input name="thicknessMm" type="number" min="0" step="0.1" defaultValue={Number(parameters.thicknessMm ?? 0) || ''} /></label></div>
          <label>{m.operationType}<select name="operationKey" defaultValue={typeof parameters.operationKey === 'string' ? parameters.operationKey : ''}><option value="">{m.notOperation}</option>{operationKeys.map((key) => <option key={key} value={key}>{operations[key]}</option>)}</select></label>
          <div className="formGrid3"><label>{m.sheetWidth}<input name="sheetWidthMm" type="number" min="1" defaultValue={Number(parameters.sheetWidthMm ?? 0) || ''} /></label><label>{m.sheetHeight}<input name="sheetHeightMm" type="number" min="1" defaultValue={Number(parameters.sheetHeightMm ?? 0) || ''} /></label><label>{m.waste}<input name="wastePct" type="number" min="0" step="0.1" defaultValue={Number(parameters.wastePct ?? 0)} /></label></div>
          <div className="formActions"><Link href="/price-book" className="secondary linkButton">{m.cancel}</Link><button type="submit" className="primary">{m.save}</button></div>
        </form> : null}
      </section>
    </div>
  </AppShell>;
}
