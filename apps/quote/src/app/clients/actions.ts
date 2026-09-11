'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/lib/workspace';

const allowedRoles = new Set(['owner', 'admin', 'sales', 'designer', 'technologist']);

function cleanText(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? '').trim().slice(0, max);
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
  redirect('/clients?created=1');
}
