'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hashClientQuoteToken, validClientQuoteToken } from '@/lib/client-quote-access';
import { createClient } from '@/lib/supabase/server';

function text(formData: FormData, name: string, max = 500) {
  return String(formData.get(name) ?? '').trim().slice(0, max);
}

export async function respondToPublicQuote(formData: FormData) {
  const token = text(formData, 'token', 120);
  const decision = text(formData, 'decision', 20);
  const note = text(formData, 'note', 500);
  if (!validClientQuoteToken(token)) redirect('/q/invalid');
  if (!['accepted','rejected'].includes(decision)) redirect(`/q/${token}?error=decision`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('quote_public_respond', {
    p_token_hash: hashClientQuoteToken(token),
    p_decision: decision,
    p_note: note || null,
  });
  if (error || data !== decision) redirect(`/q/${token}?error=response`);
  revalidatePath(`/q/${token}`);
  redirect(`/q/${token}?responded=${decision}`);
}
