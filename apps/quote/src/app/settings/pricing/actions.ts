'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PriceBookItem } from '@/lib/engineering';
import {
  PRICE_BOOK_DEFAULT_ROLES,
  isPriceBookItemValidForDefaultRole,
  type PriceBookDefaults,
} from '@/lib/price-book-defaults';
import { requireWorkspace } from '@/lib/workspace';

function percentToBps(formData: FormData, name: string) {
  const raw = String(formData.get(name) ?? '').trim().replace(',', '.');
  const percent = Number(raw);
  if (!Number.isFinite(percent) || percent < 0 || percent >= 100) return null;
  return Math.round(percent * 100);
}

function currentSettings(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function savePricingSettings(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/settings/pricing?error=permission');

  const targetMarginBps = percentToBps(formData, 'targetMarginPercent');
  const minimumMarginBps = percentToBps(formData, 'minimumMarginPercent');
  const overheadBps = percentToBps(formData, 'overheadPercent');
  if (targetMarginBps === null) redirect('/settings/pricing?error=margin');
  if (minimumMarginBps === null) redirect('/settings/pricing?error=minimum-margin');
  if (overheadBps === null) redirect('/settings/pricing?error=overhead');
  if (minimumMarginBps > targetMarginBps) redirect('/settings/pricing?error=minimum-above-target');

  const current = currentSettings(organization.settings);
  const currentQuote = currentSettings(current.quote);
  const settings = {
    ...current,
    quote: {
      ...currentQuote,
      targetMarginBps,
      minimumMarginBps,
      overheadBps,
      pricingFormulaVersion: 'mq-margin-0.1.14',
    },
  };

  const { error } = await supabase
    .from('organizations')
    .update({ settings, updated_at: new Date().toISOString() })
    .eq('id', organization.id);

  if (error) redirect('/settings/pricing?error=save');

  revalidatePath('/settings/pricing');
  revalidatePath('/projects');
  revalidatePath('/dashboard');
  redirect('/settings/pricing?saved=1');
}

export async function savePriceBookDefaults(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect('/settings/pricing?error=permission');

  const requested: PriceBookDefaults = {};
  for (const defaultRole of PRICE_BOOK_DEFAULT_ROLES) {
    const id = String(formData.get(defaultRole) ?? '').trim();
    if (!id) continue;
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) redirect('/settings/pricing?error=defaults');
    requested[defaultRole] = id;
  }

  const ids = [...new Set(Object.values(requested))];
  let items: PriceBookItem[] = [];
  if (ids.length) {
    const { data, error } = await supabase
      .from('quote_price_book_items')
      .select('id, category, name, unit, currency, purchase_price_minor, parameters_json')
      .eq('organization_id', organization.id)
      .eq('active', true)
      .eq('currency', organization.currency)
      .in('id', ids);
    if (error) redirect('/settings/pricing?error=defaults');
    items = (data ?? []) as PriceBookItem[];
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  for (const defaultRole of PRICE_BOOK_DEFAULT_ROLES) {
    const id = requested[defaultRole];
    if (!id) continue;
    const item = byId.get(id);
    if (!item || !isPriceBookItemValidForDefaultRole(item, defaultRole)) {
      redirect('/settings/pricing?error=defaults');
    }
  }

  const current = currentSettings(organization.settings);
  const currentQuote = currentSettings(current.quote);
  const settings = {
    ...current,
    quote: {
      ...currentQuote,
      priceBookDefaults: requested,
    },
  };

  const { error } = await supabase
    .from('organizations')
    .update({ settings, updated_at: new Date().toISOString() })
    .eq('id', organization.id);
  if (error) redirect('/settings/pricing?error=save');

  revalidatePath('/settings/pricing');
  revalidatePath('/projects');
  revalidatePath('/dashboard');
  redirect('/settings/pricing?saved=defaults');
}
