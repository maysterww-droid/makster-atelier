import { checkoutConfigured, webhookConfigured } from '@/lib/billing';
import type { Locale } from '@/lib/i18n';
import { getReadinessEnvironmentMessages } from '@/lib/i18n-readiness';

export type ReadinessState = 'ready' | 'warning' | 'blocked';

export type ReadinessCheck = {
  key: string;
  label: string;
  state: ReadinessState;
  detail: string;
};

function has(name: string) {
  return Boolean(String(process.env[name] ?? '').trim());
}

export function environmentReadiness(locale: Locale): ReadinessCheck[] {
  const m = getReadinessEnvironmentMessages(locale);
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
  const validAppUrl = /^https:\/\//.test(appUrl);
  const supabasePublic = has('NEXT_PUBLIC_SUPABASE_URL') && has('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  const emailReady = has('RESEND_API_KEY') && has('QUOTE_EMAIL_FROM');
  const billingWebhookReady = webhookConfigured();
  const billingCheckoutReady = checkoutConfigured('founder') && checkoutConfigured('pro') && checkoutConfigured('workshop');

  return [
    {
      key: 'supabase-public',
      label: m.supabasePublicLabel,
      state: supabasePublic ? 'ready' : 'blocked',
      detail: supabasePublic ? m.supabasePublicReady : m.supabasePublicMissing,
    },
    {
      key: 'app-url',
      label: m.appUrlLabel,
      state: validAppUrl ? 'ready' : 'blocked',
      detail: validAppUrl ? m.appUrlReady : m.appUrlMissing,
    },
    {
      key: 'resend',
      label: m.emailLabel,
      state: emailReady ? 'ready' : 'warning',
      detail: emailReady ? m.emailReady : m.emailMissing,
    },
    {
      key: 'supabase-admin',
      label: m.serverDbLabel,
      state: has('SUPABASE_SERVICE_ROLE_KEY') ? 'ready' : 'warning',
      detail: has('SUPABASE_SERVICE_ROLE_KEY') ? m.serverDbReady : m.serverDbMissing,
    },
    {
      key: 'lemon-webhook',
      label: m.lemonWebhookLabel,
      state: billingWebhookReady ? 'ready' : 'warning',
      detail: billingWebhookReady ? m.lemonWebhookReady : m.lemonWebhookMissing,
    },
    {
      key: 'lemon-checkout',
      label: m.lemonCheckoutLabel,
      state: billingCheckoutReady ? 'ready' : 'warning',
      detail: billingCheckoutReady ? m.lemonCheckoutReady : m.lemonCheckoutMissing,
    },
  ];
}

export function overallReadiness(checks: ReadinessCheck[]): ReadinessState {
  if (checks.some((check) => check.state === 'blocked')) return 'blocked';
  if (checks.some((check) => check.state === 'warning')) return 'warning';
  return 'ready';
}
