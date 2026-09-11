'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

const allowedRoles = new Set(['owner', 'admin', 'sales', 'designer', 'technologist']);

function cleanText(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? '').trim().slice(0, max);
}

function cleanId(formData: FormData, name: string) {
  const value = cleanText(formData, name, 80);
  return /^[0-9a-fA-F-]{36}$/.test(value) ? value : '';
}

export async function createClient(formData: FormData) {
  const { supabase, organization, userId, role } = await requireWorkspace();
  if (!allowedRoles.has(role)) redirect('/clients?error=permission');

  const displayName = cleanText(formData, 'displayName', 200);
  const email = cleanText(formData, 'email', 320) || null;
  const phone = cleanText(formData, 'phone', 80) || null;
  const address = cleanText(formData, 'address', 500);

  if (!displayName) redirect('/clients?error=name');

  const { error } = await supabase.from('clients').insert({
    organization_id: organization.id,
    display_name: displayName,
    email,
    phone,
    address: address ? { formatted: address, street: address } : {},
    created_by: userId,
  });

  if (error) redirect('/clients?error=create');

  revalidatePath('/clients');
  revalidatePath('/');
  redirect('/clients?created=1');
}

export async function updateClient(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  const clientId = cleanId(formData, 'clientId');
  if (!clientId) redirect('/clients?error=client');
  if (!allowedRoles.has(role)) redirect(`/clients/${clientId}?error=permission`);

  const displayName = cleanText(formData, 'displayName', 200);
  const email = cleanText(formData, 'email', 320) || null;
  const phone = cleanText(formData, 'phone', 80) || null;
  const address = cleanText(formData, 'address', 500);
  if (!displayName) redirect(`/clients/${clientId}?error=name`);

  const { error } = await supabase
    .from('clients')
    .update({
      display_name: displayName,
      email,
      phone,
      address: address ? { formatted: address, street: address } : {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('organization_id', organization.id)
    .is('archived_at', null);

  if (error) redirect(`/clients/${clientId}?error=update`);

  revalidatePath('/clients');
  revalidatePath(`/clients/${clientId}`);
  revalidatePath('/projects');
  redirect(`/clients/${clientId}?saved=1`);
}

export async function archiveClient(formData: FormData) {
  const { supabase, organization, role } = await requireWorkspace();
  const clientId = cleanId(formData, 'clientId');
  if (!clientId) redirect('/clients?error=client');
  if (!allowedRoles.has(role)) redirect(`/clients/${clientId}?error=permission`);

  const { count, error: projectsError } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organization.id)
    .eq('client_id', clientId)
    .is('archived_at', null);

  if (projectsError) redirect(`/clients/${clientId}?error=projects`);
  if ((count ?? 0) > 0) redirect(`/clients/${clientId}?error=active-projects`);

  const { error } = await supabase
    .from('clients')
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .eq('organization_id', organization.id)
    .is('archived_at', null);

  if (error) redirect(`/clients/${clientId}?error=archive`);

  revalidatePath('/clients');
  revalidatePath('/');
  redirect('/clients?archived=1');
}
