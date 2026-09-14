'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

const operationKeys = new Set([
  'cutting',
  'edge-banding',
  'carcass-drilling',
  'hinge-cup',
  'drawer-drilling',
  'back-groove',
]);
const hardwareRoles = new Set(['cargo','lift','corner','rail','sliding']);
const allowedCategories = new Set(['board', 'front', 'edge', 'hardware', 'operation', 'labour', 'delivery', 'installation', 'overhead', 'other', 'worktop', 'plinth', 'filler', 'decor']);
const allowedUnits = new Set(['sheet', 'm2', 'm', 'pcs', 'set', 'hour', 'job']);
const supportedCurrencies = new Set(['CZK', 'EUR', 'PLN', 'USD']);

function normalizeCurrency(value: unknown, fallback: string) {
  const currency = String(value ?? fallback).trim().toUpperCase();
  return supportedCurrencies.has(currency) ? currency : '';
}

function moneyToMinor(raw: string) {
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) throw new Error('Invalid price');
  const [whole, fraction = ''] = normalized.split('.');
  return Number(BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2)));
}

function currentSettings(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readPriceFields(formData: FormData, defaultCurrency: string) {
  const category = String(formData.get('category') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim().slice(0, 300);
  const unit = String(formData.get('unit') ?? 'pcs').trim();
  const currency = normalizeCurrency(formData.get('currency'), defaultCurrency);
  const manufacturer = String(formData.get('manufacturer') ?? '').trim().slice(0, 200) || null;
  const sku = String(formData.get('sku') ?? '').trim().slice(0, 200) || null;
  const priceRaw = String(formData.get('price') ?? '');

  if (!allowedCategories.has(category) || !allowedUnits.has(unit) || !currency || !name || !priceRaw) throw new Error('fields');

  const purchasePriceMinor = moneyToMinor(priceRaw);
  const parameters: Record<string, number | string> = {};
  const thicknessMm = Number(formData.get('thicknessMm') ?? 0);
  if (Number.isFinite(thicknessMm) && thicknessMm > 0) parameters.thicknessMm = thicknessMm;

  if (unit === 'sheet') {
    const sheetWidthMm = Number(formData.get('sheetWidthMm') ?? 0);
    const sheetHeightMm = Number(formData.get('sheetHeightMm') ?? 0);
    const wastePct = Number(formData.get('wastePct') ?? 0);
    if (!(sheetWidthMm > 0 && sheetHeightMm > 0)) throw new Error('sheet');
    parameters.sheetWidthMm = sheetWidthMm;
    parameters.sheetHeightMm = sheetHeightMm;
    parameters.wastePct = Math.max(0, Number.isFinite(wastePct) ? wastePct : 0);
  }

  if (category === 'operation') {
    const operationKey = String(formData.get('operationKey') ?? '').trim();
    if (!operationKeys.has(operationKey)) throw new Error('operation');
    parameters.operationKey = operationKey;
  }

  if (category === 'hardware') {
    const hardwareRole = String(formData.get('hardwareRole') ?? '').trim();
    if (hardwareRole) {
      if (!hardwareRoles.has(hardwareRole)) throw new Error('hardware-role');
      if (!['pcs','set'].includes(unit)) throw new Error('hardware-unit');
      parameters.hardwareRole = hardwareRole;
    }
  }

  return { category, name, unit, currency, manufacturer, sku, purchasePriceMinor, parameters };
}

function detectDelimiter(header: string) {
  const counts = [
    { delimiter: ';', count: (header.match(/;/g) ?? []).length },
    { delimiter: '\t', count: (header.match(/\t/g) ?? []).length },
    { delimiter: ',', count: (header.match(/,/g) ?? []).length },
  ].sort((a, b) => b.count - a.count);
  return counts[0]?.count ? counts[0].delimiter : ',';
}

function parseCsv(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field.trim());
      field = '';
    } else if (char === '\n') {
      row.push(field.trim());
      field = '';
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else if (char !== '\r') {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function normalizedHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function rowValue(row: string[], headerIndex: Map<string, number>, ...aliases: string[]) {
  for (const alias of aliases) {
    const index = headerIndex.get(normalizedHeader(alias));
    if (index !== undefined) return String(row[index] ?? '').trim();
  }
  return '';
}

function positiveNumber(raw: string) {
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function nonNegativeNumber(raw: string) {
  const value = Number(raw.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export async function seedDemoPriceBook() {
  const { supabase, organization, userId, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/price-book?error=permission');

  const currency = organization.currency;
  const demoRows = [
    {sku:'DEMO-MQ-BOARD',category:'board',name:'DEMO · Board 18 mm',unit:'sheet',purchase_price_minor:10000,parameters_json:{demo:true,demoSeedKey:'board',thicknessMm:18,sheetWidthMm:2800,sheetHeightMm:2070,wastePct:8}},
    {sku:'DEMO-MQ-FRONT',category:'front',name:'DEMO · Front material',unit:'m2',purchase_price_minor:10000,parameters_json:{demo:true,demoSeedKey:'front',thicknessMm:18}},
    {sku:'DEMO-MQ-EDGE',category:'edge',name:'DEMO · Edge band',unit:'m',purchase_price_minor:1000,parameters_json:{demo:true,demoSeedKey:'edge'}},
    {sku:'DEMO-MQ-HINGE',category:'hardware',name:'DEMO · Hinge',unit:'pcs',purchase_price_minor:1000,parameters_json:{demo:true,demoSeedKey:'hinge'}},
    {sku:'DEMO-MQ-DRAWER',category:'hardware',name:'DEMO · Drawer system',unit:'set',purchase_price_minor:10000,parameters_json:{demo:true,demoSeedKey:'drawer'}},
    {sku:'DEMO-MQ-LABOUR',category:'labour',name:'DEMO · Labour hour',unit:'hour',purchase_price_minor:10000,parameters_json:{demo:true,demoSeedKey:'labour'}},
    {sku:'DEMO-MQ-OP-CUT',category:'operation',name:'DEMO · Cutting',unit:'pcs',purchase_price_minor:100,parameters_json:{demo:true,demoSeedKey:'op-cut',operationKey:'cutting'}},
    {sku:'DEMO-MQ-OP-EDGE',category:'operation',name:'DEMO · Edge banding',unit:'m',purchase_price_minor:100,parameters_json:{demo:true,demoSeedKey:'op-edge',operationKey:'edge-banding'}},
    {sku:'DEMO-MQ-OP-CARCASS',category:'operation',name:'DEMO · Carcass drilling',unit:'pcs',purchase_price_minor:100,parameters_json:{demo:true,demoSeedKey:'op-carcass',operationKey:'carcass-drilling'}},
    {sku:'DEMO-MQ-OP-HINGE',category:'operation',name:'DEMO · Hinge drilling',unit:'pcs',purchase_price_minor:100,parameters_json:{demo:true,demoSeedKey:'op-hinge',operationKey:'hinge-cup'}},
    {sku:'DEMO-MQ-OP-DRAWER',category:'operation',name:'DEMO · Drawer drilling',unit:'pcs',purchase_price_minor:100,parameters_json:{demo:true,demoSeedKey:'op-drawer',operationKey:'drawer-drilling'}},
    {sku:'DEMO-MQ-OP-BACK',category:'operation',name:'DEMO · Back groove',unit:'m',purchase_price_minor:100,parameters_json:{demo:true,demoSeedKey:'op-back',operationKey:'back-groove'}},
    {sku:'DEMO-MQ-WORKTOP',category:'worktop',name:'DEMO · Worktop',unit:'m',purchase_price_minor:10000,parameters_json:{demo:true,demoSeedKey:'worktop'}},
    {sku:'DEMO-MQ-PLINTH',category:'plinth',name:'DEMO · Plinth',unit:'m',purchase_price_minor:1000,parameters_json:{demo:true,demoSeedKey:'plinth'}},
    {sku:'DEMO-MQ-DELIVERY',category:'delivery',name:'DEMO · Delivery',unit:'job',purchase_price_minor:10000,parameters_json:{demo:true,demoSeedKey:'delivery'}},
    {sku:'DEMO-MQ-INSTALL',category:'installation',name:'DEMO · Installation',unit:'job',purchase_price_minor:10000,parameters_json:{demo:true,demoSeedKey:'installation'}},
  ];

  const { data: existing, error: existingError } = await supabase
    .from('quote_price_book_items')
    .select('id, sku')
    .eq('organization_id', organization.id)
    .eq('currency', currency)
    .eq('active', true)
    .like('sku', 'DEMO-MQ-%');
  if (existingError) redirect('/price-book?error=demo-seed');

  const existingSkus = new Set((existing ?? []).map((row) => row.sku));
  const missing = demoRows.filter((row) => !existingSkus.has(row.sku)).map((row) => ({
    organization_id: organization.id,
    category: row.category,
    name: row.name,
    manufacturer: 'Makster Quote',
    sku: row.sku,
    unit: row.unit,
    currency,
    purchase_price_minor: row.purchase_price_minor,
    parameters_json: row.parameters_json,
    source: 'manual',
    active: true,
    created_by: userId,
  }));
  if (missing.length) {
    const { error } = await supabase.from('quote_price_book_items').insert(missing);
    if (error) redirect('/price-book?error=demo-seed');
  }

  const { data: seeded, error: seededError } = await supabase
    .from('quote_price_book_items')
    .select('id, sku')
    .eq('organization_id', organization.id)
    .eq('currency', currency)
    .eq('active', true)
    .like('sku', 'DEMO-MQ-%');
  if (seededError) redirect('/price-book?error=demo-seed');

  const ids = new Map((seeded ?? []).map((row) => [row.sku, row.id]));
  const current = currentSettings(organization.settings);
  const currentQuote = currentSettings(current.quote);
  const currentDefaults = currentSettings(currentQuote.priceBookDefaults);
  const settings = {
    ...current,
    quote: {
      ...currentQuote,
      priceBookDefaults: {
        ...currentDefaults,
        boardItemId: currentDefaults.boardItemId ?? ids.get('DEMO-MQ-BOARD'),
        backItemId: currentDefaults.backItemId ?? ids.get('DEMO-MQ-BOARD'),
        frontItemId: currentDefaults.frontItemId ?? ids.get('DEMO-MQ-FRONT'),
        edgeItemId: currentDefaults.edgeItemId ?? ids.get('DEMO-MQ-EDGE'),
        hingeItemId: currentDefaults.hingeItemId ?? ids.get('DEMO-MQ-HINGE'),
        drawerItemId: currentDefaults.drawerItemId ?? ids.get('DEMO-MQ-DRAWER'),
        labourItemId: currentDefaults.labourItemId ?? ids.get('DEMO-MQ-LABOUR'),
      },
    },
  };
  const { error: settingsError } = await supabase.from('organizations').update({settings,updated_at:new Date().toISOString()}).eq('id',organization.id);
  if (settingsError) redirect('/price-book?error=demo-seed');

  revalidatePath('/price-book');
  revalidatePath('/settings/pricing');
  revalidatePath('/library');
  revalidatePath('/projects');
  revalidatePath('/dashboard');
  redirect('/price-book?setup=demo');
}

export async function addPriceBookItem(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/price-book?error=permission');

  let fields: ReturnType<typeof readPriceFields>;
  try { fields = readPriceFields(formData, organization.currency); } catch (error) {
    const code = error instanceof Error ? error.message : 'fields';
    redirect(`/price-book?error=${encodeURIComponent(code)}`);
  }

  const { error } = await supabase.from('quote_price_book_items').insert({
    organization_id: organization.id,
    category: fields.category,
    name: fields.name,
    manufacturer: fields.manufacturer,
    sku: fields.sku,
    unit: fields.unit,
    currency: fields.currency,
    purchase_price_minor: fields.purchasePriceMinor,
    parameters_json: fields.parameters,
    source: 'manual',
    active: true,
  });

  if (error) redirect('/price-book?error=create');
  revalidatePath('/price-book');
  revalidatePath('/dashboard');
}

export async function importPriceBookCsv(formData: FormData) {
  const { supabase, organization, userId, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/price-book?error=permission');

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) redirect('/price-book?error=import-file');
  if (file.size > 1_500_000) redirect('/price-book?error=import-size');

  const text = (await file.text()).replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const parsed = parseCsv(text, delimiter);
  if (parsed.length < 2) redirect('/price-book?error=import-empty');
  if (parsed.length > 501) redirect('/price-book?error=import-limit');

  const headers = parsed[0].map(normalizedHeader);
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  for (const required of ['category', 'name', 'unit', 'price']) {
    if (!headerIndex.has(required)) redirect(`/price-book?error=import-header&missing=${required}`);
  }

  const insertRows: Record<string, unknown>[] = [];
  for (let index = 1; index < parsed.length; index += 1) {
    const row = parsed[index];
    if (row.every((value) => !value.trim())) continue;
    const line = index + 1;
    const category = rowValue(row, headerIndex, 'category').toLowerCase();
    const name = rowValue(row, headerIndex, 'name').slice(0, 300);
    const unit = rowValue(row, headerIndex, 'unit').toLowerCase();
    const currency = normalizeCurrency(rowValue(row, headerIndex, 'currency'), organization.currency);
    const price = rowValue(row, headerIndex, 'price', 'purchaseprice');
    const manufacturer = rowValue(row, headerIndex, 'manufacturer').slice(0, 200) || null;
    const sku = rowValue(row, headerIndex, 'sku').slice(0, 200) || null;

    if (!allowedCategories.has(category) || !allowedUnits.has(unit) || !currency || !name || !price) {
      redirect(`/price-book?error=import-row&row=${line}`);
    }

    let purchasePriceMinor: number;
    try { purchasePriceMinor = moneyToMinor(price); } catch {
      redirect(`/price-book?error=import-price&row=${line}`);
    }

    const parameters: Record<string, number | string> = {};
    const thicknessMm = positiveNumber(rowValue(row, headerIndex, 'thicknessmm', 'thickness'));
    if (thicknessMm > 0) parameters.thicknessMm = thicknessMm;

    if (unit === 'sheet') {
      const sheetWidthMm = positiveNumber(rowValue(row, headerIndex, 'sheetwidthmm', 'sheetwidth', 'widthmm'));
      const sheetHeightMm = positiveNumber(rowValue(row, headerIndex, 'sheetheightmm', 'sheetheight', 'heightmm'));
      if (!(sheetWidthMm > 0 && sheetHeightMm > 0)) redirect(`/price-book?error=import-sheet&row=${line}`);
      parameters.sheetWidthMm = sheetWidthMm;
      parameters.sheetHeightMm = sheetHeightMm;
      parameters.wastePct = nonNegativeNumber(rowValue(row, headerIndex, 'wastepct', 'waste'));
    }

    if (category === 'operation') {
      const operationKey = rowValue(row, headerIndex, 'operationkey', 'operation').toLowerCase();
      if (!operationKeys.has(operationKey)) redirect(`/price-book?error=import-operation&row=${line}`);
      parameters.operationKey = operationKey;
    }

    if (category === 'hardware') {
      const hardwareRole = rowValue(row, headerIndex, 'hardwarerole', 'hardwaretype').toLowerCase();
      if (hardwareRole) {
        if (!hardwareRoles.has(hardwareRole) || !['pcs','set'].includes(unit)) redirect(`/price-book?error=import-row&row=${line}`);
        parameters.hardwareRole = hardwareRole;
      }
    }

    insertRows.push({
      organization_id: organization.id,
      category,
      name,
      manufacturer,
      sku,
      unit,
      currency,
      purchase_price_minor: purchasePriceMinor,
      parameters_json: parameters,
      source: 'csv',
      active: true,
      created_by: userId,
    });
  }

  if (!insertRows.length) redirect('/price-book?error=import-empty');
  const { error } = await supabase.from('quote_price_book_items').insert(insertRows);
  if (error) redirect('/price-book?error=import-write');

  revalidatePath('/price-book');
  revalidatePath('/dashboard');
  redirect(`/price-book?imported=${insertRows.length}`);
}

export async function updatePriceBookItem(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/price-book?error=permission');

  const itemId = String(formData.get('itemId') ?? '').trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(itemId)) redirect('/price-book?error=item');

  let fields: ReturnType<typeof readPriceFields>;
  try { fields = readPriceFields(formData, organization.currency); } catch (error) {
    const code = error instanceof Error ? error.message : 'fields';
    redirect(`/price-book/${itemId}?error=${encodeURIComponent(code)}`);
  }

  const { data: updated, error } = await supabase
    .from('quote_price_book_items')
    .update({
      category: fields.category,
      name: fields.name,
      manufacturer: fields.manufacturer,
      sku: fields.sku,
      unit: fields.unit,
      currency: fields.currency,
      purchase_price_minor: fields.purchasePriceMinor,
      parameters_json: fields.parameters,
      source: 'manual',
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('organization_id', organization.id)
    .eq('active', true)
    .select('id')
    .maybeSingle();

  if (error || !updated) redirect(`/price-book/${itemId}?error=update`);
  revalidatePath('/price-book');
  revalidatePath(`/price-book/${itemId}`);
  revalidatePath('/dashboard');
  redirect('/price-book');
}

export async function deactivatePriceBookItem(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/price-book?error=permission');

  const itemId = String(formData.get('itemId') ?? '').trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(itemId)) redirect('/price-book?error=item');

  const { error } = await supabase
    .from('quote_price_book_items')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .eq('organization_id', organization.id)
    .eq('active', true);

  if (error) redirect('/price-book?error=deactivate');
  revalidatePath('/price-book');
  revalidatePath('/dashboard');
}
