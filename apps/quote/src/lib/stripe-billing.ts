import { appBaseUrl, PAID_PLANS, type CanonicalQuotePlan, type QuoteSubscriptionStatus } from '@/lib/billing';

const MANAGED_PAYMENTS_API_VERSION = '2026-03-04.preview';

function env(name: string) {
  return String(process.env[name] ?? '').trim();
}

export function stripeSecretKey() {
  return env('STRIPE_SECRET_KEY');
}

export function stripeWebhookSecret() {
  return env('STRIPE_WEBHOOK_SECRET');
}

export function stripePriceIdForPlan(plan: CanonicalQuotePlan) {
  if (plan === 'starter') return env('STRIPE_STARTER_MONTHLY_PRICE_ID');
  if (plan === 'workshop') return env('STRIPE_WORKSHOP_MONTHLY_PRICE_ID');
  if (plan === 'atelier') return env('STRIPE_ATELIER_MONTHLY_PRICE_ID');
  return '';
}

export function planForStripePriceId(priceId: string | null | undefined): CanonicalQuotePlan | null {
  const value = String(priceId ?? '').trim();
  if (!value) return null;

  for (const plan of PAID_PLANS) {
    if (stripePriceIdForPlan(plan) === value) return plan;
  }

  if (env('STRIPE_PRO_MONTHLY_PRICE_ID') === value || env('STRIPE_FOUNDER_MONTHLY_PRICE_ID') === value) return 'starter';
  return null;
}

export function stripeCheckoutConfigured(plan?: CanonicalQuotePlan) {
  if (!stripeSecretKey()) return false;
  return plan ? Boolean(stripePriceIdForPlan(plan)) : PAID_PLANS.some((candidate) => Boolean(stripePriceIdForPlan(candidate)));
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

  const normalizedPath = path.replace(/^\/+/, '');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (normalizedPath === 'checkout/sessions' && params.get('managed_payments[enabled]') === 'true') {
    headers['Stripe-Version'] = MANAGED_PAYMENTS_API_VERSION;
  }

  return fetch(`https://api.stripe.com/v1/${normalizedPath}`, {
    method: 'POST',
    headers,
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
