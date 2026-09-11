'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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

export async function publishCommercialQuote(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  const projectId = clean(formData, 'projectId', 80);
  if (!publishRoles.has(role)) redirect(`/projects/${projectId}?error=publish-permission`);

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, project_type, currency, client_id, settings, current_revision_id')
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .maybeSingle();
  if (projectError || !project) redirect('/?error=project');
  if (!project.client_id) redirect(`/projects/${projectId}?error=publish-client`);
  if (!project.current_revision_id) redirect(`/projects/${projectId}?error=publish-revision`);

  const [revisionResult, clientResult, cabinetsResult, priceResult] = await Promise.all([
    supabase.from('project_revisions').select('id, revision_number').eq('id', project.current_revision_id).eq('project_id', projectId).eq('organization_id', organization.id).maybeSingle(),
    supabase.from('clients').select('id, display_name, email, phone, address').eq('id', project.client_id).eq('organization_id', organization.id).maybeSingle(),
    supabase.from('quote_cabinets').select('id, module_key, name, width_mm, height_mm, depth_mm, quantity, engine_version, computed_cost_json').eq('project_id', projectId).eq('organization_id', organization.id).order('sort_order').order('created_at'),
    supabase.from('quote_price_book_items').select('id, category, name, unit, purchase_price_minor').eq('organization_id', organization.id).eq('active', true),
  ]);

  if (revisionResult.error || !revisionResult.data) redirect(`/projects/${projectId}?error=publish-revision`);
  if (clientResult.error || !clientResult.data) redirect(`/projects/${projectId}?error=publish-client`);
  if (cabinetsResult.error || priceResult.error) redirect(`/projects/${projectId}?error=publish-data`);

  const commercial = readProjectCommercialSettings(project.settings);
  const priceBook = priceResult.data ?? [];
  const selectedExtra = (id: string, category: 'delivery' | 'installation' | 'other') =>
    priceBook.find((item) => item.id === id && item.category === category && item.unit === 'job');
  const delivery = selectedExtra(commercial.deliveryItemId, 'delivery');
  const installation = selectedExtra(commercial.installationItemId, 'installation');
  const other = selectedExtra(commercial.otherItemId, 'other');

  const quoteSettings = (organization.settings?.quote ?? {}) as Record<string, unknown>;
  const targetMarginBps = Number(quoteSettings.targetMarginBps ?? 3500);
  const overheadBps = Number(quoteSettings.overheadBps ?? 0);
  const cabinets = cabinetsResult.data ?? [];
  const pricing = calculateProjectPricing(cabinets as never[], {
    deliveryMinor: minorFromUnknown(delivery?.purchase_price_minor),
    installationMinor: minorFromUnknown(installation?.purchase_price_minor),
    otherMinor: minorFromUnknown(other?.purchase_price_minor),
  }, { targetMarginBps, overheadBps, taxBps: commercial.taxBps });

  if (pricing.cabinetCount === 0) redirect(`/projects/${projectId}?error=publish-empty`);
  if (pricing.incompleteCabinets > 0) redirect(`/projects/${projectId}?error=publish-incomplete`);

  const issuedAt = new Date().toISOString();
  const validUntil = addDays(issuedAt, commercial.validityDays);
  const extras: QuoteSnapshotExtra[] = [
    delivery ? { category:'delivery' as const, name:delivery.name, amountMinor:String(delivery.purchase_price_minor) } : null,
    installation ? { category:'installation' as const, name:installation.name, amountMinor:String(installation.purchase_price_minor) } : null,
    other ? { category:'other' as const, name:other.name, amountMinor:String(other.purchase_price_minor) } : null,
  ].filter((value): value is QuoteSnapshotExtra => value !== null);

  const client = clientResult.data;
  const brand = readQuoteBrand(organization.settings, organization.name);
  const depositMinor = calculateDepositMinor(pricing.pricing.grossSalesMinor, commercial.depositBps);
  const snapshot: QuoteSnapshot = {
    schemaVersion: 'mq-quote-0.1.4',
    issuedAt,
    validUntil,
    locale: commercial.documentLocale,
    currency: project.currency,
    project: { id:project.id, name:project.name, revisionNumber:revisionResult.data.revision_number },
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
    terms: {
      depositBps: commercial.depositBps,
      productionLeadText: commercial.productionLeadText,
      paymentTerms: commercial.paymentTerms,
      warrantyText: commercial.warrantyText,
      clientNote: commercial.clientNote,
    },
    amounts: {
      netMinor: pricing.pricing.netSalesMinor.toString(),
      taxMinor: pricing.pricing.taxMinor.toString(),
      totalMinor: pricing.pricing.grossSalesMinor.toString(),
      depositMinor: depositMinor.toString(),
      taxBps: commercial.taxBps,
    },
  };

  const estimateJson = {
    schemaVersion: 'mq-estimate-0.1.4',
    projectId,
    projectRevision: revisionResult.data.revision_number,
    costs: Object.fromEntries(Object.entries(pricing.costs).map(([key, value]) => [key, value?.toString() ?? '0'])),
    pricing: {
      directCostMinor: pricing.pricing.directCostMinor.toString(),
      overheadMinor: pricing.pricing.overheadMinor.toString(),
      trueCostMinor: pricing.pricing.trueCostMinor.toString(),
      netSalesMinor: pricing.pricing.netSalesMinor.toString(),
      taxMinor: pricing.pricing.taxMinor.toString(),
      grossSalesMinor: pricing.pricing.grossSalesMinor.toString(),
      profitMinor: pricing.pricing.profitMinor.toString(),
      marginBps: pricing.pricing.marginBps,
      markupBps: pricing.pricing.markupBps,
    },
    targetMarginBps,
    overheadBps,
  };

  const engineeringChecksum = sha256(cabinets.map((cabinet) => ({ id:cabinet.id, engineVersion:cabinet.engine_version, computed: cabinet.computed_cost_json })));
  const pricingFingerprint = sha256({ targetMarginBps, overheadBps, taxBps:commercial.taxBps, delivery:delivery?.id ?? '', installation:installation?.id ?? '', other:other?.id ?? '' });
  const estimateFingerprint = sha256(estimateJson);
  const quoteFingerprint = sha256(snapshot);

  const { data: quoteId, error: publishError } = await supabase.rpc('quote_publish_commercial_snapshot', {
    p_project_id: projectId,
    p_client_id: project.client_id,
    p_client_name: client.display_name,
    p_currency: project.currency,
    p_project_revision_id: project.current_revision_id,
    p_project_revision: revisionResult.data.revision_number,
    p_valid_until: validUntil,
    p_direct_cost_minor: pricing.pricing.directCostMinor.toString(),
    p_overhead_minor: pricing.pricing.overheadMinor.toString(),
    p_total_cost_minor: pricing.pricing.trueCostMinor.toString(),
    p_net_sales_minor: pricing.pricing.netSalesMinor.toString(),
    p_tax_minor: pricing.pricing.taxMinor.toString(),
    p_gross_sales_minor: pricing.pricing.grossSalesMinor.toString(),
    p_profit_minor: pricing.pricing.profitMinor.toString(),
    p_margin_bps: pricing.pricing.marginBps,
    p_markup_bps: pricing.pricing.markupBps,
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
