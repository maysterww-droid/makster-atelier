'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function credentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  };
}

async function canonicalOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (configured && /^https?:\/\//i.test(configured)) return configured;

  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  if (!host) return null;
  const proto = requestHeaders.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function login(formData: FormData) {
  const { email, password } = credentials(formData);
  if (!email || !password) redirect('/login?error=missing');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect('/login?error=invalid');

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(formData: FormData) {
  const { email, password } = credentials(formData);
  if (!email || password.length < 8) redirect('/login?error=password');

  const origin = await canonicalOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: origin ? { emailRedirectTo: `${origin}/auth/confirm` } : undefined,
  });

  if (error) {
    if (error.code === 'email_address_not_authorized') redirect('/login?error=signup-email');
    if (error.status === 429) redirect('/login?error=signup-rate');
    redirect('/login?error=signup');
  }
  if (data.session) redirect('/onboarding');
  redirect('/login?message=check-email');
}
