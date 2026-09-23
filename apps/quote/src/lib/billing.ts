export type QuotePlan = 'free' | 'founder' | 'pro' | 'workshop';
export type QuoteSubscriptionStatus = 'inactive' | 'trialing' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired';

export const PLAN_LABELS: Record<QuotePlan, string> = {
  free: 'Free',
  founder: 'Founder',
  pro: 'Pro',
  workshop: 'Workshop',
};

export const PAID_PLANS: QuotePlan[] = ['founder', 'pro', 'workshop'];

function env(name: string) {
  return String(process.env[name] ?? '').trim();
}

export function appBaseUrl() {
  return (env('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000').replace(/\/+$/, '');
}

export function lemonApiKey() {
  return env('LEMONSQUEEZY_API_KEY');
}

export function lemonStoreId() {
  return env('LEMONSQUEEZY_STORE_ID');
}

export function lemonWebhookSecret() {
  return env('LEMONSQUEEZY_WEBHOOK_SECRET');
}

export function lemonTestMode() {
  return env('LEMONSQUEEZY_TEST_MODE').toLowerCase() !== 'false';
}

export function variantIdForPlan(plan: QuotePlan) {
  if (plan === 'founder') return env('LEMONSQUEEZY_VARIANT_FOUNDER');
  if (plan === 'pro') return env('LEMONSQUEEZY_VARIANT_PRO');
  if (plan === 'workshop') return env('LEMONSQUEEZY_VARIANT_WORKSHOP');
  return '';
}

export function planForVariantId(variantId: string | number | null | undefined): QuotePlan | null {
  const value = String(variantId ?? '').trim();
  if (!value) return null;
  for (const plan of PAID_PLANS) {
    if (variantIdForPlan(plan) === value) return plan;
  }
  return null;
}

export function checkoutConfigured(plan?: QuotePlan) {
  if (!lemonApiKey() || !lemonStoreId()) return false;
  return plan ? Boolean(variantIdForPlan(plan)) : PAID_PLANS.some((candidate) => Boolean(variantIdForPlan(candidate)));
}

export function webhookConfigured() {
  return Boolean(lemonWebhookSecret() && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function normalizeLemonStatus(status: unknown): QuoteSubscriptionStatus {
  switch (String(status ?? '').toLowerCase()) {
    case 'on_trial': return 'trialing';
    case 'active': return 'active';
    case 'paused': return 'paused';
    case 'past_due': return 'past_due';
    case 'unpaid': return 'past_due';
    case 'cancelled': return 'cancelled';
    case 'expired': return 'expired';
    default: return 'inactive';
  }
}

export function isPaidAccess(status: QuoteSubscriptionStatus, currentPeriodEnd?: string | null) {
  if (status === 'active' || status === 'trialing' || status === 'paused' || status === 'past_due') return true;
  if (status === 'cancelled' && currentPeriodEnd) return new Date(currentPeriodEnd).getTime() > Date.now();
  return false;
}
