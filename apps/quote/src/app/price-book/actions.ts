'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

function moneyToMinor(raw: string) {
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) throw new Error('Invalid price');
  const [whole, fraction = ''] = normalized.split('.');
  return Number(BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2)));
}

export async function addPriceBookItem(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/price-book?error=permission');

  const category = String(formData.get('category') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const unit = String(formData.get('unit') ?? 'pcs').trim();
  const manufacturer = String(formData.get('manufacturer') ?? '').trim() || null;
  const sku = String(formData.get('sku') ?? '').trim() || null;
  const priceRaw = String(formData.get('price') ?? '');
  const allowedCategories = new Set(['board', 'front', 'edge', 'hardware', 'operation', 'labour', 'delivery', 'installation', 'overhead', 'other']);
  const allowedUnits = new Set(['sheet', 'm2', 'm', 'pcs', 'set', 'hour', 'job']);

  if (!allowedCategories.has(category) || !allowedUnits.has(unit) || !name || !priceRaw) redirect('/price-book?error=fields');

  let purchasePriceMinor: number;
  try { purchasePriceMinor = moneyToMinor(priceRaw); } catch { redirect('/price-book?error=price'); }

  const parameters: Record<string, number> = {};
  if (unit === 'sheet') {
    const sheetWidthMm = Number(formData.get('sheetWidthMm') ?? 0);
    const sheetHeightMm = Number(formData.get('sheetHeightMm') ?? 0);
    const wastePct = Number(formData.get('wastePct') ?? 0);
    if (!(sheetWidthMm > 0 && sheetHeightMm > 0)) redirect('/price-book?error=sheet');
    parameters.sheetWidthMm = sheetWidthMm;
    parameters.sheetHeightMm = sheetHeightMm;
    parameters.wastePct = Math.max(0, wastePct || 0);
  }

  const { error } = await supabase.from('quote_price_book_items').insert({
    organization_id: organization.id,
    category,
    name,
    manufacturer,
    sku,
    unit,
    currency: organization.currency,
    purchase_price_minor: purchasePriceMinor,
    parameters_json: parameters,
    source: 'manual',
    active: true,
  });

  if (error) redirect('/price-book?error=create');
  revalidatePath('/price-book');
  revalidatePath('/');
}
