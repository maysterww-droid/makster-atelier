'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { readCommercialOptions, type CommercialVariantKey, type SellingAdjustmentMode } from '@/lib/project-commercial-options';
import { readProjectCommercialSettings, type DocumentLocale } from '@/lib/project-pricing';
import { requireWorkspace } from '@/lib/workspace';

const allowedRoles = new Set(['owner', 'admin', 'sales', 'designer', 'technologist']);
const allowedLocales = new Set<DocumentLocale>(['ru', 'en', 'cs', 'de', 'pl']);
const allowedVariants = new Set<CommercialVariantKey>(['base', 'standard', 'premium']);
const allowedAdjustments = new Set<SellingAdjustmentMode>(['none', 'discount', 'surcharge']);

function cleanText(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? '').trim().slice(0, max);
}

function measuredNumber(formData: FormData, name: string) {
  const value = Number(String(formData.get(name) ?? '0').replace(',', '.'));
  return Number.isFinite(value) ? Math.max(0, Math.min(10_000, value)) : -1;
}

function percentToBps(formData: FormData, name: string, fallbackBps: number, maxPercent = 95) {
  const raw = String(formData.get(name) ?? '').trim();
  if (!raw) return fallbackBps;
  const value = Number(raw.replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > maxPercent) return -1;
  return Math.round(value * 100);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function saveProjectCommercial(formData: FormData) {
  const { supabase, organization, userId, role } = await requireWorkspace();
  const projectId = cleanText(formData, 'projectId', 80);
  if (!allowedRoles.has(role)) redirect(`/projects/${projectId}?error=permission`);

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, client_id, currency, settings')
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .maybeSingle();
  if (projectError || !project) redirect('/?error=project');

  const rootSettings = record(project.settings);
  const currentQuoteCommercial = record(rootSettings.quoteCommercial);
  const current = readProjectCommercialSettings(project.settings);
  const quoteSettings = record(organization.settings?.quote);
  const defaultMarginBps = Number(quoteSettings.targetMarginBps ?? 3500);
  const currentOptions = readCommercialOptions(project.settings, defaultMarginBps);

  const taxPercent = Number(String(formData.get('taxPercent') ?? '0').replace(',', '.'));
  const validityDaysRaw = Number(formData.get('validityDays') ?? 14);
  const depositPercent = Number(String(formData.get('depositPercent') ?? '0').replace(',', '.'));
  if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 1000) redirect(`/projects/${projectId}?error=tax`);
  if (!Number.isFinite(validityDaysRaw) || validityDaysRaw < 1 || validityDaysRaw > 365) redirect(`/projects/${projectId}?error=validity`);
  if (!Number.isFinite(depositPercent) || depositPercent < 0 || depositPercent > 100) redirect(`/projects/${projectId}?error=deposit`);

  const baseMarginBps = percentToBps(formData, 'baseMarginPercent', currentOptions.variantMarginsBps.base);
  const standardMarginBps = percentToBps(formData, 'standardMarginPercent', currentOptions.variantMarginsBps.standard);
  const premiumMarginBps = percentToBps(formData, 'premiumMarginPercent', currentOptions.variantMarginsBps.premium);
  const adjustmentBps = percentToBps(formData, 'adjustmentPercent', currentOptions.adjustmentBps, 50);
  if ([baseMarginBps, standardMarginBps, premiumMarginBps, adjustmentBps].some((value) => value < 0)) redirect(`/projects/${projectId}?error=pricing-options`);

  const selectedVariantRaw = cleanText(formData, 'selectedVariant', 20) as CommercialVariantKey;
  const selectedVariant = allowedVariants.has(selectedVariantRaw) ? selectedVariantRaw : currentOptions.selectedVariant;
  const adjustmentModeRaw = cleanText(formData, 'adjustmentMode', 20) as SellingAdjustmentMode;
  const adjustmentMode = allowedAdjustments.has(adjustmentModeRaw) ? adjustmentModeRaw : currentOptions.adjustmentMode;

  const worktopLengthM = measuredNumber(formData, 'worktopLengthM');
  const plinthLengthM = measuredNumber(formData, 'plinthLengthM');
  const fillerAreaM2 = measuredNumber(formData, 'fillerAreaM2');
  const decorAreaM2 = measuredNumber(formData, 'decorAreaM2');
  if ([worktopLengthM, plinthLengthM, fillerAreaM2, decorAreaM2].some((value) => value < 0)) redirect(`/projects/${projectId}?error=extras-quantity`);

  const localeRaw = cleanText(formData, 'documentLocale', 10) as DocumentLocale;
  const documentLocale: DocumentLocale = allowedLocales.has(localeRaw) ? localeRaw : 'ru';
  const selectedClientId = cleanText(formData, 'clientId', 80);
  const newClientName = cleanText(formData, 'newClientName', 200);
  const newClientEmail = cleanText(formData, 'newClientEmail', 320) || null;
  const newClientPhone = cleanText(formData, 'newClientPhone', 80) || null;
  const newClientAddress = cleanText(formData, 'newClientAddress', 500);

  let clientId: string | null = selectedClientId || project.client_id || null;

  if (newClientName) {
    const { data: createdClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        organization_id: organization.id,
        display_name: newClientName,
        email: newClientEmail,
        phone: newClientPhone,
        address: newClientAddress ? { formatted: newClientAddress, street: newClientAddress } : {},
        created_by: userId,
      })
      .select('id')
      .single();
    if (clientError || !createdClient) redirect(`/projects/${projectId}?error=client`);
    clientId = createdClient.id;
  } else if (selectedClientId) {
    const { data: selectedClient } = await supabase
      .from('clients')
      .select('id')
      .eq('id', selectedClientId)
      .eq('organization_id', organization.id)
      .maybeSingle();
    if (!selectedClient) redirect(`/projects/${projectId}?error=client`);
    clientId = selectedClient.id;
  }

  const requestedExtras = [
    { field: 'deliveryItemId', category: 'delivery', unit: 'job' },
    { field: 'installationItemId', category: 'installation', unit: 'job' },
    { field: 'otherItemId', category: 'other', unit: 'job' },
    { field: 'worktopItemId', category: 'worktop', unit: 'm' },
    { field: 'plinthItemId', category: 'plinth', unit: 'm' },
    { field: 'fillerItemId', category: 'filler', unit: 'm2' },
    { field: 'decorItemId', category: 'decor', unit: 'm2' },
  ] as const;
  const extraIds = requestedExtras.map(({ field }) => cleanText(formData, field, 80)).filter(Boolean);
  const validIds = new Map<string, { category: string; unit: string; currency: string }>();

  if (extraIds.length) {
    const { data: extraRows, error: extrasError } = await supabase
      .from('quote_price_book_items')
      .select('id, category, unit, currency')
      .eq('organization_id', organization.id)
      .eq('active', true)
      .in('id', extraIds);
    if (extrasError) redirect(`/projects/${projectId}?error=extras`);
    for (const row of extraRows ?? []) validIds.set(row.id, { category: row.category, unit: row.unit, currency: row.currency });
  }

  const extraValues: Record<string, string> = {};
  for (const { field, category, unit } of requestedExtras) {
    const id = cleanText(formData, field, 80);
    const row = id ? validIds.get(id) : undefined;
    if (id && (!row || row.category !== category || row.unit !== unit || row.currency !== project.currency)) redirect(`/projects/${projectId}?error=extras-unit`);
    extraValues[field] = id;
  }

  const measuredRequirements = [
    { quantity: worktopLengthM, field: 'worktopItemId' },
    { quantity: plinthLengthM, field: 'plinthItemId' },
    { quantity: fillerAreaM2, field: 'fillerItemId' },
    { quantity: decorAreaM2, field: 'decorItemId' },
  ];
  if (measuredRequirements.some(({ quantity, field }) => quantity > 0 && !extraValues[field])) redirect(`/projects/${projectId}?error=extras-price`);

  const nextSettings = {
    ...rootSettings,
    taxBps: Math.round(taxPercent * 100),
    quoteCommercial: {
      ...currentQuoteCommercial,
      deliveryItemId: extraValues.deliveryItemId,
      installationItemId: extraValues.installationItemId,
      otherItemId: extraValues.otherItemId,
      worktopItemId: extraValues.worktopItemId,
      worktopLengthM,
      plinthItemId: extraValues.plinthItemId,
      plinthLengthM,
      fillerItemId: extraValues.fillerItemId,
      fillerAreaM2,
      decorItemId: extraValues.decorItemId,
      decorAreaM2,
      selectedVariant,
      variantMarginsBps: { base: baseMarginBps, standard: standardMarginBps, premium: premiumMarginBps },
      adjustmentMode,
      adjustmentBps,
      taxBps: Math.round(taxPercent * 100),
      validityDays: Math.round(validityDaysRaw),
      documentLocale,
      clientNote: cleanText(formData, 'clientNote', 2000),
      issuedAt: current.issuedAt ?? new Date().toISOString(),
      depositBps: Math.round(depositPercent * 100),
      productionLeadText: cleanText(formData, 'productionLeadText', 300),
      paymentTerms: cleanText(formData, 'paymentTerms', 1200),
      warrantyText: cleanText(formData, 'warrantyText', 1200),
    },
  };

  const { error: updateError } = await supabase
    .from('projects')
    .update({ client_id: clientId, settings: nextSettings, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('organization_id', organization.id);
  if (updateError) redirect(`/projects/${projectId}?error=commercial`);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/quote`);
  redirect(`/projects/${projectId}?saved=commercial`);
}
