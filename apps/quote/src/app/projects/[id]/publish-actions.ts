'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { applySellingAdjustment, COMMERCIAL_VARIANT_LABELS, manualCostTotal, readCommercialOptions } from '@/lib/project-commercial-options';
import { calculateMeasuredExtras, readMeasuredExtraSettings } from '@/lib/project-measured-extras';
import { calculateDepositMinor, calculateProjectPricing, minorFromUnknown, readProjectCommercialSettings } from '@/lib/project-pricing';
import { readQuoteBrand } from '@/lib/quote-brand';
import type { QuoteSnapshot, QuoteSnapshotExtra } from '@/lib/quote-snapshot';
import { requireWorkspace } from '@/lib/workspace';

const publishRoles = new Set(['owner', 'admin', 'technologist']);
const statusRoles = new Set(['owner', 'admin', 'sales', 'technologist']);

function clean(formData: FormData, name: string, max = 100) {
  return String(formData.get(name) ?? '').trim().slice(0, max);
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(',')}}`;
}

function sha256(value: unknown) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function addressText(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const address = value as Record<string, unknown>;
  const formatted = typeof address.formatted === 'string' ? address.formatted.trim() : '';
  if (formatted) return formatted;
  return ['street', 'address1', 'postal_code', 'zip', 'city', 'country']
    .map((key) => address[key])
    .filter((part) => typeof part === 'string' && part.trim())
    .join(', ');
}

function addDays(iso: string, days: number) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function readFrozenRevision(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : '';
  const revisionNumber = Number(row.revisionNumber);
  if (!/^[0-9a-fA-F-]{36}$/.test(id) || !Number.isInteger(revisionNumber) || revisionNumber < 1) return null;
  return { id, revisionNumber, created: row.created === true };
}

export async function publishCommercialQuote(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  const projectId = clean(formData, 'projectId', 80);
  if (!publishRoles.has(role)) redirect(`/projects/${projectId}?error=publish-permission`);

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, project_type, currency, client_id, settings')
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .maybeSingle();
  if (projectError || !project) redirect('/?error=project');
  if (!project.client_id) redirect(`/projects/${projectId}?error=publish-client`);

  const [clientResult, cabinetsResult, priceResult] = await Promise.all([
    supabase.from('clients').select('id, display_name, email, phone, address').eq('id', project.client_id).eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_cabinets')
      .select('id, module_key, name, sort_order, width_mm, height_mm, depth_mm, quantity, construction_json, material_refs_json, hardware_refs_json, computed_parts_json, engine_version, computed_cost_json')
      .eq('project_id', projectId)
      .eq('organization_id', organization.id)
      .order('sort_order')
      .order('created_at'),
    supabase.from('quote_price_book_items').select('id, category, name, unit, purchase_price_minor').eq('organization_id', organization.id).eq('active', true),
  ]);

  if (clientResult.error || !clientResult.data) redirect(`/projects/${projectId}?error=publish-client`);
  if (cabinetsResult.error || priceResult.error) redirect(`/projects/${projectId}?error=publish-data`);

  const commercial = readProjectCommercialSettings(project.settings);
  const measuredSettings = readMeasuredExtraSettings(project.settings);
  const priceBook = priceResult.data ?? [];
  const selectedExtra = (id: string, category: 'delivery' | 'installation' | 'other') =>
    priceBook.find((item) => item.id === id && item.category === category && item.unit === 'job');
  const delivery = selectedExtra(commercial.deliveryItemId, 'delivery');
  const installation = selectedExtra(commercial.installationItemId, 'installation');
  const other = selectedExtra(commercial.otherItemId, 'other');
  const measured = calculateMeasuredExtras(measuredSettings, priceBook);
  if (measured.missing.length) redirect(`/projects/${projectId}?error=publish-extras`);

  const quoteSettings = (organization.settings?.quote ?? {}) as Record<string, unknown>;
  const workspaceMarginBps = Number(quoteSettings.targetMarginBps ?? 3500);
  const overheadBps = Number(quoteSettings.overheadBps ?? 0);
  const commercialOptions = readCommercialOptions(project.settings, workspaceMarginBps);
  const targetMarginBps = commercialOptions.variantMarginsBps[commercialOptions.selectedVariant];
  const manualTotal = manualCostTotal(commercialOptions.manualCostLines);
  const cabinets = cabinetsResult.data ?? [];
  const pricing = calculateProjectPricing(cabinets as never[], {
    deliveryMinor: minorFromUnknown(delivery?.purchase_price_minor),
    installationMinor: minorFromUnknown(installation?.purchase_price_minor),
    otherMinor: minorFromUnknown(other?.purchase_price_minor) + measured.totalMinor + manualTotal,
  }, { targetMarginBps, overheadBps, taxBps: commercial.taxBps });
  const adjusted = applySellingAdjustment(pricing.pricing, commercial.taxBps, commercialOptions.adjustmentMode, commercialOptions.adjustmentBps);

  if (pricing.cabinetCount === 0) redirect(`/projects/${projectId}?error=publish-empty`);
  if (pricing.incompleteCabinets > 0) redirect(`/projects/${projectId}?error=publish-incomplete`);

  const issuedAt = new Date().toISOString();
  const technicalSnapshot = {
    source: 'makster-quote',
    quoteVersion: '0.1.13',
    project: {
      name: project.name,
      projectType: project.project_type,
      currency: project.currency,
    },
    modules: cabinets.map((cabinet) => ({
      id: cabinet.id,
      moduleKey: cabinet.module_key,
      name: cabinet.name,
      sortOrder: Number(cabinet.sort_order ?? 0),
      widthMm: Number(cabinet.width_mm),
      heightMm: Number(cabinet.height_mm),
      depthMm: Number(cabinet.depth_mm),
      quantity: Number(cabinet.quantity ?? 1),
      construction: cabinet.construction_json,
      materialRefs: cabinet.material_refs_json,
      hardwareRefs: cabinet.hardware_refs_json,
      computedParts: cabinet.computed_parts_json,
      engineVersion: cabinet.engine_version,
    })),
  };

  const { data: frozenRaw, error: freezeError } = await supabase.rpc('quote_freeze_project_revision', {
    p_project_id: projectId,
    p_snapshot: technicalSnapshot,
    p_change_set: [{ type: 'commercial_publish', at: issuedAt }],
  });
  const frozenRevision = readFrozenRevision(frozenRaw);
  if (freezeError || !frozenRevision) redirect(`/projects/${projectId}?error=publish-revision`);

  const validUntil = addDays(issuedAt, commercial.validityDays);
  const fixedExtras: Array<QuoteSnapshotExtra | null> = [
    delivery ? { category:'delivery', name:delivery.name, amountMinor:String(delivery.purchase_price_minor), unit:'job' } : null,
    installation ? { category:'installation', name:installation.name, amountMinor:String(installation.purchase_price_minor), unit:'job' } : null,
    other ? { category:'other', name:other.name, amountMinor:String(other.purchase_price_minor), unit:'job' } : null,
  ];
  const measuredExtras: QuoteSnapshotExtra[] = measured.lines.map((line) => ({
    category: line.category,
    name: line.name,
    amountMinor: line.amountMinor.toString(),
    quantity: line.quantity,
    unit: line.unit,
  }));
  const manualExtras: QuoteSnapshotExtra[] = commercialOptions.manualCostLines.map((line) => ({
    category: 'manual',
    name: line.name,
    amountMinor: line.costMinor.toString(),
    unit: 'job',
  }));
  const extras: QuoteSnapshotExtra[] = [
    ...fixedExtras.filter((value): value is QuoteSnapshotExtra => value !== null),
    ...measuredExtras,
    ...manualExtras,
  ];

  const client = clientResult.data;
  const brand = readQuoteBrand(organization.settings, organization.name);
  const depositMinor = calculateDepositMinor(adjusted.grossSalesMinor, commercial.depositBps);
  const snapshot: QuoteSnapshot = {
    schemaVersion: 'mq-quote-0.1.12',
    issuedAt,
    validUntil,
    locale: commercial.documentLocale,
    currency: project.currency,
    project: { id:project.id, name:project.name, revisionNumber:frozenRevision.revisionNumber },
    client: { id:client.id, name:client.display_name, email:client.email ?? '', phone:client.phone ?? '', address:addressText(client.address) },
    supplier: brand,
    modules: cabinets.map((cabinet) => ({
      id: cabinet.id,
      name: cabinet.name,
      moduleKey: cabinet.module_key,
      widthMm: Number(cabinet.width_mm),
      heightMm: Number(cabinet.height_mm),
      depthMm: Number(cabinet.depth_mm),
      quantity: Number(cabinet.quantity ?? 1),
    })),
    extras,
    commercial: {
      variantKey: commercialOptions.selectedVariant,
      variantLabel: COMMERCIAL_VARIANT_LABELS[commercialOptions.selectedVariant],
      targetMarginBps,
      adjustmentMode: commercialOptions.adjustmentMode,
      adjustmentBps: commercialOptions.adjustmentBps,
      listNetMinor: adjusted.listNetSalesMinor.toString(),
      adjustmentMinor: adjusted.sellingAdjustmentMinor.toString(),
      actualMarginBps: adjusted.marginBps,
    },
    terms: {
      depositBps: commercial.depositBps,
      productionLeadText: commercial.productionLeadText,
      paymentTerms: commercial.paymentTerms,
      warrantyText: commercial.warrantyText,
      clientNote: commercial.clientNote,
    },
    amounts: {
      netMinor: adjusted.netSalesMinor.toString(),
      taxMinor: adjusted.taxMinor.toString(),
      totalMinor: adjusted.grossSalesMinor.toString(),
      depositMinor: depositMinor.toString(),
      taxBps: commercial.taxBps,
    },
  };

  const estimateJson = {
    schemaVersion: 'mq-estimate-0.1.13',
    projectId,
    projectRevision: frozenRevision.revisionNumber,
    projectRevisionCreated: frozenRevision.created,
    variant: snapshot.commercial,
    extras: extras.map((extra) => ({ ...extra })),
    costs: Object.fromEntries(Object.entries(pricing.costs).map(([key, value]) => [key, value?.toString() ?? '0'])),
    pricing: {
      directCostMinor: adjusted.directCostMinor.toString(),
      overheadMinor: adjusted.overheadMinor.toString(),
      trueCostMinor: adjusted.trueCostMinor.toString(),
      listNetSalesMinor: adjusted.listNetSalesMinor.toString(),
      sellingAdjustmentMinor: adjusted.sellingAdjustmentMinor.toString(),
      netSalesMinor: adjusted.netSalesMinor.toString(),
      taxMinor: adjusted.taxMinor.toString(),
      grossSalesMinor: adjusted.grossSalesMinor.toString(),
      profitMinor: adjusted.profitMinor.toString(),
      marginBps: adjusted.marginBps,
      markupBps: adjusted.markupBps,
    },
    targetMarginBps,
    overheadBps,
  };

  const engineeringChecksum = sha256(technicalSnapshot);
  const pricingFingerprint = sha256({
    targetMarginBps,
    overheadBps,
    taxBps:commercial.taxBps,
    selectedVariant: commercialOptions.selectedVariant,
    adjustmentMode: commercialOptions.adjustmentMode,
    adjustmentBps: commercialOptions.adjustmentBps,
    delivery:delivery?.id ?? '',
    installation:installation?.id ?? '',
    other:other?.id ?? '',
    extras,
  });
  const estimateFingerprint = sha256(estimateJson);
  const quoteFingerprint = sha256(snapshot);

  const { data: quoteId, error: publishError } = await supabase.rpc('quote_publish_commercial_snapshot', {
    p_project_id: projectId,
    p_client_id: project.client_id,
    p_client_name: client.display_name,
    p_currency: project.currency,
    p_project_revision_id: frozenRevision.id,
    p_project_revision: frozenRevision.revisionNumber,
    p_valid_until: validUntil,
    p_direct_cost_minor: adjusted.directCostMinor.toString(),
    p_overhead_minor: adjusted.overheadMinor.toString(),
    p_total_cost_minor: adjusted.trueCostMinor.toString(),
    p_net_sales_minor: adjusted.netSalesMinor.toString(),
    p_tax_minor: adjusted.taxMinor.toString(),
    p_gross_sales_minor: adjusted.grossSalesMinor.toString(),
    p_profit_minor: adjusted.profitMinor.toString(),
    p_margin_bps: adjusted.marginBps,
    p_markup_bps: adjusted.markupBps,
    p_estimate_json: estimateJson,
    p_quote_json: snapshot,
    p_engineering_checksum: engineeringChecksum,
    p_pricing_fingerprint_sha256: pricingFingerprint,
    p_estimate_fingerprint_sha256: estimateFingerprint,
    p_quote_fingerprint_sha256: quoteFingerprint,
  });

  if (publishError || !quoteId) redirect(`/projects/${projectId}?error=publish`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/quote/${quoteId}`);
  redirect(`/projects/${projectId}/quote/${quoteId}`);
}

export async function appendQuoteStatus(formData: FormData) {
  const { supabase, role } = await requireWorkspace();
  const projectId = clean(formData, 'projectId', 80);
  const quoteId = clean(formData, 'quoteId', 80);
  const status = clean(formData, 'status', 20);
  const note = clean(formData, 'note', 500);
  if (!statusRoles.has(role)) redirect(`/projects/${projectId}/quote/${quoteId}?error=permission`);
  if (!['sent', 'accepted', 'rejected', 'expired'].includes(status)) redirect(`/projects/${projectId}/quote/${quoteId}?error=status`);

  const { error } = await supabase.rpc('quote_append_status', { p_quote_id:quoteId, p_status:status, p_note:note || null });
  if (error) redirect(`/projects/${projectId}/quote/${quoteId}?error=status-save`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/quote/${quoteId}`);
  redirect(`/projects/${projectId}/quote/${quoteId}?saved=status`);
}
