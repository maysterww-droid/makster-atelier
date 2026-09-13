import { appBaseUrl, type QuotePlan, type QuoteSubscriptionStatus } from '@/lib/billing';

function env(name: string) {
  return String(process.env[name] ?? '').trim();
}

export function stripeSecretKey() {
  return env('STRIPE_SECRET_KEY');
}

export function stripeWebhookSecret() {
  return env('STRIPE_WEBHOOK_SECRET');
}

export function stripePriceIdForPlan(plan: QuotePlan) {
  if (plan === 'founder') return env('STRIPE_FOUNDER_MONTHLY_PRICE_ID');
  if (plan === 'pro') return env('STRIPE_PRO_MONTHLY_PRICE_ID');
  if (plan === 'workshop') return env('STRIPE_WORKSHOP_MONTHLY_PRICE_ID');
  return '';
}

export function planForStripePriceId(priceId: string | null | undefined): QuotePlan | null {
  const value = String(priceId ?? '').trim();
  if (!value) return null;
  for (const plan of ['founder', 'pro', 'workshop'] as const) {
    if (stripePriceIdForPlan(plan) === value) return plan;
  }
  return null;
}

export function stripeCheckoutConfigured(plan?: QuotePlan) {
  if (!stripeSecretKey()) return false;
  return plan ? Boolean(stripePriceIdForPlan(plan)) : ['founder', 'pro', 'workshop'].some((candidate) => Boolean(stripePriceIdForPlan(candidate as QuotePlan)));
}

export function stripeWebhookConfigured() {
  return Boolean(
    stripeWebhookSecret()
    && process.env.SUPABASE_SERVICE_ROLE_KEY
    && process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function normalizeStripeStatus(status: unknown): QuoteSubscriptionStatus {
  switch (String(status ?? '').toLowerCase()) {
    case 'trialing': return 'trialing';
    case 'active': return 'active';
    case 'past_due': return 'past_due';
    case 'unpaid': return 'past_due';
    case 'paused': return 'paused';
    case 'canceled': return 'cancelled';
    case 'cancelled': return 'cancelled';
    default: return 'inactive';
  }
}

export function stripeReturnUrl() {
  return `${appBaseUrl()}/settings/billing`;
}

export async function stripePost(path: string, params: URLSearchParams) {
  const secret = stripeSecretKey();
  if (!secret) return null;
  return fetch(`https://api.stripe.com/v1/${path.replace(/^\/+/, '')}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
    cache: 'no-store',
  });
}

export async function stripeGet(path: string) {
  const secret = stripeSecretKey();
  if (!secret) return null;
  return fetch(`https://api.stripe.com/v1/${path.replace(/^\/+/, '')}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  });
}
