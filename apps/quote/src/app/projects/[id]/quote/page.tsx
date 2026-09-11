import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatMinor } from '@/lib/calculation';
import { calculateProjectPricing, minorFromUnknown, readProjectCommercialSettings } from '@/lib/project-pricing';
import { readQuoteBrand } from '@/lib/quote-brand';
import { requireWorkspace } from '@/lib/workspace';
import { PrintQuoteButton } from '../print-button';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };

type Labels = {
  document: string; draft: string; client: string; noClient: string; project: string; date: string; validUntil: string;
  modules: string; module: string; dimensions: string; included: string; net: string; tax: string; total: string; note: string;
  supplier: string; print: string; back: string; delivery: string; installation: string; other: string;
};

const labels: Record<string, Labels> = {
  ru: { document:'Коммерческое предложение · живой просмотр',draft:'ЧЕРНОВИК',client:'Клиент',noClient:'Клиент не указан',project:'Проект',date:'Дата',validUntil:'Действительно до',modules:'Состав проекта',module:'Модуль',dimensions:'Размеры',included:'Включено в расчёт',net:'Итого без НДС',tax:'НДС / налог',total:'Итого к оплате',note:'Примечание',supplier:'Исполнитель',print:'Печать / сохранить PDF',back:'← Вернуться к проекту',delivery:'Доставка',installation:'Монтаж',other:'Прочее' },
  en: { document:'Quotation · live preview',draft:'DRAFT',client:'Client',noClient:'Client not specified',project:'Project',date:'Date',validUntil:'Valid until',modules:'Project scope',module:'Module',dimensions:'Dimensions',included:'Included in calculation',net:'Total excl. tax',tax:'Tax',total:'Total payable',note:'Note',supplier:'Supplier',print:'Print / Save PDF',back:'← Back to project',delivery:'Delivery',installation:'Installation',other:'Other' },
  cs: { document:'Cenová nabídka · živý náhled',draft:'NÁVRH',client:'Klient',noClient:'Klient neuveden',project:'Projekt',date:'Datum',validUntil:'Platnost do',modules:'Rozsah projektu',module:'Modul',dimensions:'Rozměry',included:'Zahrnuto v kalkulaci',net:'Celkem bez DPH',tax:'DPH / daň',total:'Celkem k úhradě',note:'Poznámka',supplier:'Dodavatel',print:'Tisk / uložit PDF',back:'← Zpět k projektu',delivery:'Doprava',installation:'Montáž',other:'Ostatní' },
  de: { document:'Angebot · Live-Vorschau',draft:'ENTWURF',client:'Kunde',noClient:'Kein Kunde angegeben',project:'Projekt',date:'Datum',validUntil:'Gültig bis',modules:'Projektumfang',module:'Modul',dimensions:'Maße',included:'In der Kalkulation enthalten',net:'Summe netto',tax:'MwSt. / Steuer',total:'Gesamtbetrag',note:'Hinweis',supplier:'Auftragnehmer',print:'Drucken / als PDF speichern',back:'← Zurück zum Projekt',delivery:'Lieferung',installation:'Montage',other:'Sonstiges' },
  pl: { document:'Oferta · podgląd na żywo',draft:'WERSJA ROBOCZA',client:'Klient',noClient:'Nie wskazano klienta',project:'Projekt',date:'Data',validUntil:'Ważna do',modules:'Zakres projektu',module:'Moduł',dimensions:'Wymiary',included:'Uwzględniono w kalkulacji',net:'Razem netto',tax:'VAT / podatek',total:'Razem do zapłaty',note:'Uwagi',supplier:'Wykonawca',print:'Drukuj / zapisz PDF',back:'← Wróć do projektu',delivery:'Dostawa',installation:'Montaż',other:'Inne' },
};

const intlLocale: Record<string, string> = { ru:'ru-RU', en:'en-GB', cs:'cs-CZ', de:'de-DE', pl:'pl-PL' };

function addDays(iso: string, days: number) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function addressText(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const address = value as Record<string, unknown>;
  const formatted = typeof address.formatted === 'string' ? address.formatted.trim() : '';
  if (formatted) return formatted;
  return ['street', 'address1', 'postal_code', 'zip', 'city', 'country'].map((key) => address[key]).filter((part) => typeof part === 'string' && part.trim()).join(', ');
}

export default async function QuotePage({ params }: Props) {
  const { id } = await params;
  const { supabase, organization } = await requireWorkspace();
  const [{ data: project, error: projectError }, { data: cabinets, error: cabinetsError }, { data: priceBook, error: priceError }] = await Promise.all([
    supabase.from('projects').select('id, name, currency, client_id, settings, created_at').eq('id', id).eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_cabinets').select('id, name, width_mm, height_mm, depth_mm, computed_cost_json').eq('project_id', id).eq('organization_id', organization.id).order('sort_order').order('created_at'),
    supabase.from('quote_price_book_items').select('id, category, name, unit, purchase_price_minor').eq('organization_id', organization.id).eq('active', true),
  ]);
  if (projectError || !project) notFound();
  if (cabinetsError || priceError) throw new Error('Не удалось сформировать предложение.');

  const commercial = readProjectCommercialSettings(project.settings);
  const locale = commercial.documentLocale;
  const t = labels[locale] ?? labels.ru;
  const priceRows = priceBook ?? [];
  const selected = (itemId: string, category: string) => priceRows.find((item) => item.id === itemId && item.category === category && item.unit === 'job');
  const delivery = selected(commercial.deliveryItemId, 'delivery');
  const installation = selected(commercial.installationItemId, 'installation');
  const other = selected(commercial.otherItemId, 'other');
  const quoteSettings = (organization.settings?.quote ?? {}) as Record<string, unknown>;
  const targetMarginBps = Number(quoteSettings.targetMarginBps ?? 3500);
  const overheadBps = Number(quoteSettings.overheadBps ?? 0);
  const pricing = calculateProjectPricing((cabinets ?? []) as never[], {
    deliveryMinor: minorFromUnknown(delivery?.purchase_price_minor),
    installationMinor: minorFromUnknown(installation?.purchase_price_minor),
    otherMinor: minorFromUnknown(other?.purchase_price_minor),
  }, { targetMarginBps, overheadBps, taxBps: commercial.taxBps });

  let client: { display_name: string; email: string | null; phone: string | null; address: unknown } | null = null;
  if (project.client_id) {
    const result = await supabase.from('clients').select('display_name, email, phone, address').eq('id', project.client_id).eq('organization_id', organization.id).maybeSingle();
    client = result.data ?? null;
  }

  const brand = readQuoteBrand(organization.settings, organization.name);
  const issuedAt = commercial.issuedAt ?? project.created_at;
  const issued = new Date(issuedAt);
  const validUntil = addDays(issuedAt, commercial.validityDays);
  const formatter = new Intl.DateTimeFormat(intlLocale[locale] ?? 'ru-RU', { year:'numeric', month:'long', day:'numeric' });
  const ready = pricing.cabinetCount > 0 && pricing.incompleteCabinets === 0;
  const extras = [delivery ? `${t.delivery}: ${delivery.name}` : '', installation ? `${t.installation}: ${installation.name}` : '', other ? `${t.other}: ${other.name}` : ''].filter(Boolean);

  return <main className="quoteDocument">
    <style>{`
      body{background:#eef2ef}.quoteDocument{max-width:900px;margin:24px auto;background:#fff;color:#18211d;padding:48px;box-shadow:0 18px 60px rgba(24,33,29,.12);font-family:Inter,Arial,sans-serif}.quoteToolbar{display:flex;justify-content:space-between;gap:12px;margin-bottom:34px}.quoteToolbar a{text-decoration:none;color:#1f7a5a;font-weight:700}.quotePrintButton{border:0;border-radius:10px;padding:10px 14px;background:#1f7a5a;color:#fff;font-weight:700;cursor:pointer}.quoteHead{display:flex;justify-content:space-between;gap:30px;border-bottom:2px solid #18211d;padding-bottom:24px}.quoteBrand{font-size:24px;font-weight:800}.quoteBrand small{display:block;font-size:12px;color:#68746d;margin-top:4px}.quoteNumber{text-align:right;color:#68746d;font-size:12px}.quoteNumber strong{display:block;color:#18211d;font-size:18px;margin-bottom:5px}.quoteTitle{margin:36px 0 24px}.quoteTitle h1{font-size:34px}.draftStamp{display:inline-block;margin-top:10px;border:1px solid #a83e3e;color:#a83e3e;padding:5px 9px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:.1em}.quoteInfo{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin:24px 0 34px}.quoteInfo h3{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#68746d;margin-bottom:8px}.quoteInfo strong,.quoteInfo span{display:block;margin-top:4px}.quoteTable{width:100%;border-collapse:collapse;margin:20px 0 30px}.quoteTable th,.quoteTable td{text-align:left;padding:12px;border-bottom:1px solid #dfe7e2}.quoteTable th{font-size:11px;text-transform:uppercase;color:#68746d}.quoteTotals{width:min(420px,100%);margin-left:auto}.quoteTotals div{display:flex;justify-content:space-between;gap:20px;padding:9px 0}.quoteTotals .grand{border-top:2px solid #18211d;margin-top:6px;padding-top:14px;font-size:22px;font-weight:800}.quoteNote{margin-top:34px;padding:18px;background:#f4f7f5;border-radius:12px;white-space:pre-wrap}.quoteFooter{margin-top:48px;padding-top:20px;border-top:1px solid #dfe7e2;color:#68746d;font-size:11px}.quoteIncluded{margin:24px 0;color:#68746d;font-size:13px}.quoteIncluded strong{color:#18211d}.quoteContact{line-height:1.5}@media(max-width:700px){.quoteDocument{margin:0;padding:24px}.quoteHead,.quoteInfo{grid-template-columns:1fr;display:grid}.quoteNumber{text-align:left}.quoteTitle h1{font-size:26px}}@media print{body{background:#fff}.quoteDocument{max-width:none;margin:0;padding:16mm;box-shadow:none}.quoteToolbar{display:none}@page{size:A4;margin:0}}
    `}</style>
    <div className="quoteToolbar"><Link href={`/projects/${project.id}`}>{t.back}</Link><PrintQuoteButton label={t.print}/></div>
    <header className="quoteHead"><div className="quoteBrand">{brand.tradeName}<small>{brand.legalName}</small></div><div className="quoteNumber"><strong>LIVE · MQ-{project.id.slice(0,8).toUpperCase()}</strong><span>{t.date}: {formatter.format(issued)}</span><span>{t.validUntil}: {formatter.format(validUntil)}</span></div></header>
    <section className="quoteTitle"><h1>{t.document}</h1>{!ready ? <span className="draftStamp">{t.draft}</span> : null}</section>
    <section className="quoteInfo"><div><h3>{t.client}</h3>{client ? <><strong>{client.display_name}</strong>{client.email ? <span>{client.email}</span> : null}{client.phone ? <span>{client.phone}</span> : null}{addressText(client.address) ? <span>{addressText(client.address)}</span> : null}</> : <strong>{t.noClient}</strong>}</div><div><h3>{t.project}</h3><strong>{project.name}</strong><span>{pricing.cabinetCount} {t.modules.toLowerCase()}</span></div></section>
    <h2>{t.modules}</h2>
    <table className="quoteTable"><thead><tr><th>{t.module}</th><th>{t.dimensions}</th></tr></thead><tbody>{(cabinets ?? []).map((cabinet) => <tr key={cabinet.id}><td>{cabinet.name}</td><td>{Number(cabinet.width_mm)} × {Number(cabinet.height_mm)} × {Number(cabinet.depth_mm)} mm</td></tr>)}</tbody></table>
    {extras.length ? <div className="quoteIncluded"><strong>{t.included}:</strong> {extras.join(' · ')}</div> : null}
    <section className="quoteTotals"><div><span>{t.net}</span><strong>{formatMinor(pricing.pricing.netSalesMinor, project.currency, intlLocale[locale])}</strong></div>{commercial.taxBps > 0 ? <div><span>{t.tax} {(commercial.taxBps/100).toFixed(2)}%</span><strong>{formatMinor(pricing.pricing.taxMinor, project.currency, intlLocale[locale])}</strong></div> : null}<div className="grand"><span>{t.total}</span><strong>{formatMinor(pricing.pricing.grossSalesMinor, project.currency, intlLocale[locale])}</strong></div></section>
    {commercial.clientNote ? <section className="quoteNote"><strong>{t.note}</strong><br/>{commercial.clientNote}</section> : null}
    <footer className="quoteFooter"><strong>{t.supplier}: {brand.tradeName}</strong><div className="quoteContact">{[brand.address, brand.email, brand.phone, brand.website].filter(Boolean).join(' · ')}</div><div className="quoteContact">Makster Quote · LIVE preview · MQ 0.1.4</div></footer>
  </main>;
}
