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

  const requestHeaders = await headers();
  const origin = requestHeaders.get('origin');
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: origin ? { emailRedirectTo: `${origin}/auth/confirm` } : undefined,
  });

  if (error) redirect('/login?error=signup');
  if (data.session) redirect('/onboarding');
  redirect('/login?message=check-email');
}
