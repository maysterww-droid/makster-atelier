import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { QuoteSnapshot } from './quote-snapshot';

pdfMake.addVirtualFileSystem(pdfFonts);

type LocaleLabels = {
  title: string;
  quote: string;
  client: string;
  project: string;
  issued: string;
  valid: string;
  scope: string;
  module: string;
  dimensions: string;
  quantity: string;
  included: string;
  net: string;
  tax: string;
  total: string;
  deposit: string;
  lead: string;
  payment: string;
  warranty: string;
  note: string;
  supplier: string;
};

const labels: Record<string, LocaleLabels> = {
  ru: { title:'Коммерческое предложение',quote:'Предложение',client:'Клиент',project:'Проект',issued:'Дата',valid:'Действительно до',scope:'Состав проекта',module:'Модуль',dimensions:'Размеры',quantity:'Кол-во',included:'Включено',net:'Итого без НДС',tax:'НДС / налог',total:'Итого к оплате',deposit:'Аванс',lead:'Срок изготовления',payment:'Условия оплаты',warranty:'Гарантия / условия',note:'Примечание',supplier:'Исполнитель' },
  en: { title:'Quotation',quote:'Quote',client:'Client',project:'Project',issued:'Issued',valid:'Valid until',scope:'Project scope',module:'Module',dimensions:'Dimensions',quantity:'Qty',included:'Included',net:'Total excl. tax',tax:'Tax',total:'Total payable',deposit:'Deposit',lead:'Production lead time',payment:'Payment terms',warranty:'Warranty / terms',note:'Note',supplier:'Supplier' },
  cs: { title:'Cenová nabídka',quote:'Nabídka',client:'Klient',project:'Projekt',issued:'Datum',valid:'Platnost do',scope:'Rozsah projektu',module:'Modul',dimensions:'Rozměry',quantity:'Počet',included:'Zahrnuto',net:'Celkem bez DPH',tax:'DPH / daň',total:'Celkem k úhradě',deposit:'Záloha',lead:'Doba výroby',payment:'Platební podmínky',warranty:'Záruka / podmínky',note:'Poznámka',supplier:'Dodavatel' },
  de: { title:'Angebot',quote:'Angebot',client:'Kunde',project:'Projekt',issued:'Datum',valid:'Gültig bis',scope:'Projektumfang',module:'Modul',dimensions:'Maße',quantity:'Anzahl',included:'Enthalten',net:'Summe netto',tax:'MwSt. / Steuer',total:'Gesamtbetrag',deposit:'Anzahlung',lead:'Fertigungszeit',payment:'Zahlungsbedingungen',warranty:'Garantie / Bedingungen',note:'Hinweis',supplier:'Auftragnehmer' },
  pl: { title:'Oferta',quote:'Oferta',client:'Klient',project:'Projekt',issued:'Data',valid:'Ważna do',scope:'Zakres projektu',module:'Moduł',dimensions:'Wymiary',quantity:'Ilość',included:'Uwzględniono',net:'Razem netto',tax:'VAT / podatek',total:'Razem do zapłaty',deposit:'Zaliczka',lead:'Termin wykonania',payment:'Warunki płatności',warranty:'Gwarancja / warunki',note:'Uwagi',supplier:'Wykonawca' },
};

const intlLocale: Record<string, string> = { ru:'ru-RU', en:'en-GB', cs:'cs-CZ', de:'de-DE', pl:'pl-PL' };
const extraNames: Record<string, Record<string, string>> = {
  ru: { delivery:'Доставка', installation:'Монтаж', other:'Прочее' },
  en: { delivery:'Delivery', installation:'Installation', other:'Other' },
  cs: { delivery:'Doprava', installation:'Montáž', other:'Ostatní' },
  de: { delivery:'Lieferung', installation:'Montage', other:'Sonstiges' },
  pl: { delivery:'Dostawa', installation:'Montaż', other:'Inne' },
};

function money(minor: string, currency: string, locale: string) {
  const value = Number(BigInt(minor)) / 100;
  return new Intl.NumberFormat(intlLocale[locale] ?? 'ru-RU', { style:'currency', currency }).format(value);
}

function date(iso: string, locale: string) {
  return new Intl.DateTimeFormat(intlLocale[locale] ?? 'ru-RU', { year:'numeric', month:'long', day:'numeric' }).format(new Date(iso));
}

function contactLines(snapshot: QuoteSnapshot) {
  const s = snapshot.supplier;
  return [s.legalName && s.legalName !== s.tradeName ? s.legalName : '', s.registrationId ? `IČO: ${s.registrationId}` : '', s.vatId ? `DIČ: ${s.vatId}` : '', s.address, s.email, s.phone, s.website, s.bankAccount ? `Účet / Account: ${s.bankAccount}` : '', s.iban ? `IBAN: ${s.iban}` : ''].filter(Boolean);
}

export async function buildQuotePdf(snapshot: QuoteSnapshot): Promise<Buffer> {
  const locale = snapshot.locale;
  const t = labels[locale] ?? labels.ru;
  const extraLabel = extraNames[locale] ?? extraNames.ru;
  const quoteRef = `MQ-${(snapshot.quoteVersion ?? 1).toString().padStart(3, '0')}-${snapshot.project.id.slice(0, 8).toUpperCase()}`;
  const terms: unknown[] = [];

  if (snapshot.terms.depositBps > 0) {
    terms.push({ columns:[{ text:t.deposit, color:'#647169' }, { text:`${(snapshot.terms.depositBps / 100).toFixed(2)}% · ${money(snapshot.amounts.depositMinor, snapshot.currency, locale)}`, bold:true, alignment:'right' }], margin:[0,3,0,3] });
  }
  if (snapshot.terms.productionLeadText) terms.push({ columns:[{ text:t.lead, color:'#647169' }, { text:snapshot.terms.productionLeadText, alignment:'right' }], margin:[0,3,0,3] });
  if (snapshot.terms.paymentTerms) terms.push({ columns:[{ text:t.payment, color:'#647169' }, { text:snapshot.terms.paymentTerms, alignment:'right' }], margin:[0,3,0,3] });
  if (snapshot.terms.warrantyText) terms.push({ columns:[{ text:t.warranty, color:'#647169' }, { text:snapshot.terms.warrantyText, alignment:'right' }], margin:[0,3,0,3] });

  const moduleRows = snapshot.modules.map((module) => [
    module.name,
    `${module.widthMm} × ${module.heightMm} × ${module.depthMm} mm`,
    String(module.quantity),
  ]);

  const included = snapshot.extras.map((extra) => `${extraLabel[extra.category] ?? extra.category}: ${extra.name}`).join(' · ');
  const supplier = contactLines(snapshot);

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [44, 46, 44, 50],
    info: { title:`${t.title} ${quoteRef}`, author:snapshot.supplier.tradeName, subject:snapshot.project.name },
    defaultStyle: { font:'Roboto', fontSize:9.5, color:'#18211d' },
    styles: {
      brand: { fontSize:22, bold:true, color:'#196c50' },
      title: { fontSize:25, bold:true, margin:[0,26,0,16] },
      section: { fontSize:12, bold:true, margin:[0,18,0,8] },
      small: { fontSize:8, color:'#647169' },
    },
    content: [
      {
        columns: [
          { width:'*', stack:[{ text:snapshot.supplier.tradeName || 'Makster Atelier', style:'brand' }, { text:snapshot.supplier.legalName || '', style:'small', margin:[0,4,0,0] }] },
          { width:210, alignment:'right', stack:[{ text:`${t.quote} ${quoteRef}`, bold:true, fontSize:13 }, { text:`${t.issued}: ${date(snapshot.issuedAt, locale)}`, style:'small', margin:[0,4,0,0] }, { text:`${t.valid}: ${date(snapshot.validUntil, locale)}`, style:'small' }] },
        ],
      },
      { canvas:[{ type:'line', x1:0, y1:12, x2:507, y2:12, lineWidth:1.5, lineColor:'#18211d' }] },
      { text:t.title, style:'title' },
      {
        columns: [
          { width:'50%', stack:[{ text:t.client, style:'small' }, { text:snapshot.client.name, bold:true, margin:[0,4,0,0] }, snapshot.client.email ? { text:snapshot.client.email } : {}, snapshot.client.phone ? { text:snapshot.client.phone } : {}, snapshot.client.address ? { text:snapshot.client.address } : {}] },
          { width:'50%', stack:[{ text:t.project, style:'small' }, { text:snapshot.project.name, bold:true, margin:[0,4,0,0] }, { text:`Revision ${snapshot.project.revisionNumber}`, style:'small' }] },
        ],
        columnGap: 24,
      },
      { text:t.scope, style:'section' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 190, 45],
          body: [[{ text:t.module, bold:true }, { text:t.dimensions, bold:true }, { text:t.quantity, bold:true, alignment:'right' }], ...moduleRows.map((row) => [row[0], row[1], { text:row[2], alignment:'right' }])],
        },
        layout: 'lightHorizontalLines',
      },
      included ? { text:[{ text:`${t.included}: `, bold:true }, included], margin:[0,10,0,0], color:'#647169' } : {},
      {
        margin:[0,22,0,0],
        columns: [
          { width:'*', text:'' },
          { width:260, stack:[
            { columns:[{ text:t.net, color:'#647169' }, { text:money(snapshot.amounts.netMinor, snapshot.currency, locale), bold:true, alignment:'right' }], margin:[0,4,0,4] },
            ...(snapshot.amounts.taxBps > 0 ? [{ columns:[{ text:`${t.tax} ${(snapshot.amounts.taxBps/100).toFixed(2)}%`, color:'#647169' }, { text:money(snapshot.amounts.taxMinor, snapshot.currency, locale), bold:true, alignment:'right' }], margin:[0,4,0,8] }] : []),
            { canvas:[{ type:'line', x1:0, y1:0, x2:260, y2:0, lineWidth:1.2, lineColor:'#18211d' }] },
            { columns:[{ text:t.total, bold:true, fontSize:13 }, { text:money(snapshot.amounts.totalMinor, snapshot.currency, locale), bold:true, fontSize:13, alignment:'right' }], margin:[0,9,0,0] },
          ] },
        ],
      },
      ...(terms.length ? [{ text:t.payment, style:'section' }, ...terms] : []),
      ...(snapshot.terms.clientNote ? [{ text:t.note, style:'section' }, { text:snapshot.terms.clientNote, fillColor:'#f3f6f4', margin:[10,9,10,9] }] : []),
      { text:t.supplier, style:'section' },
      { text:supplier.length ? supplier.join('\n') : snapshot.supplier.tradeName },
      ...(snapshot.supplier.footerText ? [{ text:snapshot.supplier.footerText, style:'small', margin:[0,18,0,0] }] : []),
      { text:'Makster Quote · MQ 0.1.4', style:'small', margin:[0,22,0,0] },
    ],
  };

  const output = await pdfMake.createPdf(docDefinition).getBuffer();
  return Buffer.from(output);
}
