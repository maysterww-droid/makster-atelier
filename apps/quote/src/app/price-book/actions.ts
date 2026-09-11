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
const allowedCategories = new Set(['board', 'front', 'edge', 'hardware', 'operation', 'labour', 'delivery', 'installation', 'overhead', 'other']);
const allowedUnits = new Set(['sheet', 'm2', 'm', 'pcs', 'set', 'hour', 'job']);

function moneyToMinor(raw: string) {
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) throw new Error('Invalid price');
  const [whole, fraction = ''] = normalized.split('.');
  return Number(BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2)));
}

function readPriceFields(formData: FormData) {
  const category = String(formData.get('category') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim().slice(0, 300);
  const unit = String(formData.get('unit') ?? 'pcs').trim();
  const manufacturer = String(formData.get('manufacturer') ?? '').trim().slice(0, 200) || null;
  const sku = String(formData.get('sku') ?? '').trim().slice(0, 200) || null;
  const priceRaw = String(formData.get('price') ?? '');

  if (!allowedCategories.has(category) || !allowedUnits.has(unit) || !name || !priceRaw) throw new Error('fields');

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

  return { category, name, unit, manufacturer, sku, purchasePriceMinor, parameters };
}

export async function addPriceBookItem(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/price-book?error=permission');

  let fields: ReturnType<typeof readPriceFields>;
  try { fields = readPriceFields(formData); } catch (error) {
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
    currency: organization.currency,
    purchase_price_minor: fields.purchasePriceMinor,
    parameters_json: fields.parameters,
    source: 'manual',
    active: true,
  });

  if (error) redirect('/price-book?error=create');
  revalidatePath('/price-book');
  revalidatePath('/');
}

export async function updatePriceBookItem(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/price-book?error=permission');

  const itemId = String(formData.get('itemId') ?? '').trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(itemId)) redirect('/price-book?error=item');

  let fields: ReturnType<typeof readPriceFields>;
  try { fields = readPriceFields(formData); } catch (error) {
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
      currency: organization.currency,
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
  revalidatePath('/');
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
  revalidatePath('/');
}
