'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { readCommercialOptions } from '@/lib/project-commercial-options';
import { requireWorkspace } from '@/lib/workspace';

const allowedRoles = new Set(['owner', 'admin', 'sales', 'designer', 'technologist']);

function clean(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? '').trim().slice(0, max);
}

function moneyToMinor(raw: string) {
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  try {
    return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  } catch {
    return null;
  }
}

function rootRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function addManualCostLine(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  const projectId = clean(formData, 'projectId', 80);
  if (!allowedRoles.has(role)) redirect(`/projects/${projectId}?error=permission`);
  const name = clean(formData, 'manualName', 200);
  const costMinor = moneyToMinor(clean(formData, 'manualCost', 40));
  if (!projectId || !name || costMinor === null || costMinor < 0n) redirect(`/projects/${projectId}?error=manual-cost`);

  const { data: project, error } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .maybeSingle();
  if (error || !project) redirect(`/projects/${projectId}?error=manual-cost`);

  const quoteSettings = organization.settings?.quote && typeof organization.settings.quote === 'object' && !Array.isArray(organization.settings.quote)
    ? organization.settings.quote as Record<string, unknown>
    : {};
  const defaultMarginBps = Number(quoteSettings.targetMarginBps ?? 3500);
  const options = readCommercialOptions(project.settings, defaultMarginBps);
  if (options.manualCostLines.length >= 30) redirect(`/projects/${projectId}?error=manual-limit`);

  const root = rootRecord(project.settings);
  const commercial = rootRecord(root.quoteCommercial);
  const manualCostLines = [
    ...options.manualCostLines.map((line) => ({ id: line.id, name: line.name, costMinor: line.costMinor.toString() })),
    { id: randomUUID(), name, costMinor: costMinor.toString() },
  ];
  const nextSettings = { ...root, quoteCommercial: { ...commercial, manualCostLines } };

  const { error: updateError } = await supabase
    .from('projects')
    .update({ settings: nextSettings, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('organization_id', organization.id);
  if (updateError) redirect(`/projects/${projectId}?error=manual-cost`);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/quote`);
  redirect(`/projects/${projectId}?saved=manual-cost-added`);
}

export async function removeManualCostLine(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  const projectId = clean(formData, 'projectId', 80);
  const lineId = clean(formData, 'lineId', 80);
  if (!allowedRoles.has(role)) redirect(`/projects/${projectId}?error=permission`);
  if (!projectId || !lineId) redirect(`/projects/${projectId}?error=manual-cost`);

  const { data: project, error } = await supabase
    .from('projects')
    .select('settings')
    .eq('id', projectId)
    .eq('organization_id', organization.id)
    .maybeSingle();
  if (error || !project) redirect(`/projects/${projectId}?error=manual-cost`);

  const quoteSettings = organization.settings?.quote && typeof organization.settings.quote === 'object' && !Array.isArray(organization.settings.quote)
    ? organization.settings.quote as Record<string, unknown>
    : {};
  const defaultMarginBps = Number(quoteSettings.targetMarginBps ?? 3500);
  const options = readCommercialOptions(project.settings, defaultMarginBps);
  const manualCostLines = options.manualCostLines
    .filter((line) => line.id !== lineId)
    .map((line) => ({ id: line.id, name: line.name, costMinor: line.costMinor.toString() }));

  const root = rootRecord(project.settings);
  const commercial = rootRecord(root.quoteCommercial);
  const nextSettings = { ...root, quoteCommercial: { ...commercial, manualCostLines } };
  const { error: updateError } = await supabase
    .from('projects')
    .update({ settings: nextSettings, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('organization_id', organization.id);
  if (updateError) redirect(`/projects/${projectId}?error=manual-cost`);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/quote`);
  redirect(`/projects/${projectId}?saved=manual-cost-removed`);
}
