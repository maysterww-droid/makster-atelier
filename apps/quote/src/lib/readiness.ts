import { stripeCheckoutConfigured, stripeWebhookConfigured } from '@/lib/stripe-billing';

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

export function environmentReadiness(): ReadinessCheck[] {
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL ?? '').trim();
  const validAppUrl = /^https:\/\//.test(appUrl);
  const supabasePublic = has('NEXT_PUBLIC_SUPABASE_URL') && has('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  const emailReady = has('RESEND_API_KEY') && has('QUOTE_EMAIL_FROM');
  const billingWebhookReady = stripeWebhookConfigured();
  const billingCheckoutReady = stripeCheckoutConfigured('founder') && stripeCheckoutConfigured('pro') && stripeCheckoutConfigured('workshop');

  return [
    {
      key: 'supabase-public',
      label: 'Supabase app connection',
      state: supabasePublic ? 'ready' : 'blocked',
      detail: supabasePublic ? 'Public application credentials configured.' : 'Missing Supabase URL or publishable key.',
    },
    {
      key: 'app-url',
      label: 'Canonical app URL',
      state: validAppUrl ? 'ready' : 'blocked',
      detail: validAppUrl ? 'HTTPS origin configured for quote links and redirects.' : 'NEXT_PUBLIC_APP_URL must be the final HTTPS Quote application URL.',
    },
    {
      key: 'resend',
      label: 'Email delivery',
      state: emailReady ? 'ready' : 'warning',
      detail: emailReady ? 'Resend key and sender are configured.' : 'RESEND_API_KEY and/or QUOTE_EMAIL_FROM are still missing.',
    },
    {
      key: 'supabase-admin',
      label: 'Trusted server database access',
      state: has('SUPABASE_SERVICE_ROLE_KEY') ? 'ready' : 'warning',
      detail: has('SUPABASE_SERVICE_ROLE_KEY') ? 'Service-role access is available to verified server jobs.' : 'SUPABASE_SERVICE_ROLE_KEY is required before live billing webhooks.',
    },
    {
      key: 'stripe-webhook',
      label: 'Stripe webhook',
      state: billingWebhookReady ? 'ready' : 'warning',
      detail: billingWebhookReady ? 'Stripe webhook secret and trusted database access are configured.' : 'STRIPE_WEBHOOK_SECRET and/or trusted Supabase access are not configured.',
    },
    {
      key: 'stripe-checkout',
      label: 'Paid plan checkout prices',
      state: billingCheckoutReady ? 'ready' : 'warning',
      detail: billingCheckoutReady ? 'Founder, Pro and Workshop Stripe prices are configured.' : 'One or more Founder / Pro / Workshop Stripe Price IDs are missing.',
    },
  ];
}

export function overallReadiness(checks: ReadinessCheck[]): ReadinessState {
  if (checks.some((check) => check.state === 'blocked')) return 'blocked';
  if (checks.some((check) => check.state === 'warning')) return 'warning';
  return 'ready';
}
