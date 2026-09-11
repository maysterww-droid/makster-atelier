'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { readProjectCommercialSettings, type DocumentLocale } from '@/lib/project-pricing';
import { requireWorkspace } from '@/lib/workspace';

const allowedRoles = new Set(['owner', 'admin', 'sales', 'designer', 'technologist']);
const allowedLocales = new Set<DocumentLocale>(['ru', 'en', 'cs', 'de', 'pl']);

function cleanText(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? '').trim().slice(0, max);
}

export async function saveProjectCommercial(formData: FormData) {
  const { supabase, organization, userId, role } = await requireWorkspace();
  const projectId = cleanText(formData, 'projectId', 80);
  if (!allowedRoles.has(role)) redirect(`/projects/${projectId}?error=permission`);

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, client_id, settings')
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .maybeSingle();
  if (projectError || !project) redirect('/?error=project');

  const current = readProjectCommercialSettings(project.settings);
  const taxPercent = Number(String(formData.get('taxPercent') ?? '0').replace(',', '.'));
  const validityDaysRaw = Number(formData.get('validityDays') ?? 14);
  if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 1000) redirect(`/projects/${projectId}?error=tax`);
  if (!Number.isFinite(validityDaysRaw) || validityDaysRaw < 1 || validityDaysRaw > 365) redirect(`/projects/${projectId}?error=validity`);

  const localeRaw = cleanText(formData, 'documentLocale', 10) as DocumentLocale;
  const documentLocale: DocumentLocale = allowedLocales.has(localeRaw) ? localeRaw : 'ru';
  const selectedClientId = cleanText(formData, 'clientId', 80);
  const newClientName = cleanText(formData, 'newClientName', 200);
  const newClientEmail = cleanText(formData, 'newClientEmail', 320) || null;
  const newClientPhone = cleanText(formData, 'newClientPhone', 80) || null;

  let clientId: string | null = selectedClientId || project.client_id || null;

  if (newClientName) {
    const { data: createdClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        organization_id: organization.id,
        display_name: newClientName,
        email: newClientEmail,
        phone: newClientPhone,
        address: {},
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
    { field: 'deliveryItemId', category: 'delivery' },
    { field: 'installationItemId', category: 'installation' },
    { field: 'otherItemId', category: 'other' },
  ] as const;
  const extraIds = requestedExtras.map(({ field }) => cleanText(formData, field, 80)).filter(Boolean);
  const validIds = new Map<string, string>();

  if (extraIds.length) {
    const { data: extraRows, error: extrasError } = await supabase
      .from('quote_price_book_items')
      .select('id, category')
      .eq('organization_id', organization.id)
      .eq('active', true)
      .in('id', extraIds);
    if (extrasError) redirect(`/projects/${projectId}?error=extras`);
    for (const row of extraRows ?? []) validIds.set(row.id, row.category);
  }

  const extraValues: Record<string, string> = {};
  for (const { field, category } of requestedExtras) {
    const id = cleanText(formData, field, 80);
    if (id && validIds.get(id) !== category) redirect(`/projects/${projectId}?error=extras`);
    extraValues[field] = id;
  }

  const rootSettings = project.settings && typeof project.settings === 'object' && !Array.isArray(project.settings)
    ? project.settings as Record<string, unknown>
    : {};

  const nextSettings = {
    ...rootSettings,
    taxBps: Math.round(taxPercent * 100),
    quoteCommercial: {
      deliveryItemId: extraValues.deliveryItemId,
      installationItemId: extraValues.installationItemId,
      otherItemId: extraValues.otherItemId,
      taxBps: Math.round(taxPercent * 100),
      validityDays: Math.round(validityDaysRaw),
      documentLocale,
      clientNote: cleanText(formData, 'clientNote', 2000),
      issuedAt: current.issuedAt ?? new Date().toISOString(),
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
