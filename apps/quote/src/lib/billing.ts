// Legacy type kept temporarily for old Lemon Squeezy localization and webhook
// compatibility. New product code must use CanonicalQuotePlan.
export type QuotePlan = 'free' | 'founder' | 'pro' | 'workshop';
export type CanonicalQuotePlan = 'free' | 'starter' | 'workshop' | 'atelier';
export type QuoteSubscriptionStatus = 'inactive' | 'trialing' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired';

export const PLAN_LABELS: Record<CanonicalQuotePlan, string> = {
  free: 'Free Pilot',
  starter: 'Starter',
  workshop: 'Workshop',
  atelier: 'Atelier',
};

export const PLAN_MONTHLY_EUR: Record<CanonicalQuotePlan, number> = {
  free: 0,
  starter: 9,
  workshop: 29,
  atelier: 79,
};

export const PAID_PLANS: CanonicalQuotePlan[] = ['starter', 'workshop', 'atelier'];

/** Normalize old Founder/Pro rows into the 0.2 canonical plan model. */
export function normalizeQuotePlan(value: unknown): CanonicalQuotePlan {
  switch (String(value ?? '').trim().toLowerCase()) {
    case 'starter':
    case 'founder':
    case 'pro':
      return 'starter';
    case 'workshop':
      return 'workshop';
    case 'atelier':
      return 'atelier';
    default:
      return 'free';
  }
}

export function planDisplayLabel(value: unknown) {
  return PLAN_LABELS[normalizeQuotePlan(value)];
}

function env(name: string) {
  return String(process.env[name] ?? '').trim();
}

export function appBaseUrl() {
  return (env('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000').replace(/\/+$/, '');
}

// Legacy Lemon Squeezy compatibility remains isolated until the final cleanup
// phase. It is not used for new checkout sessions.
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

function legacyVariantMappings(): Array<[string, CanonicalQuotePlan]> {
  return [
    [env('LEMONSQUEEZY_VARIANT_FOUNDER'), 'starter'],
    [env('LEMONSQUEEZY_VARIANT_PRO'), 'starter'],
    [env('LEMONSQUEEZY_VARIANT_WORKSHOP'), 'workshop'],
  ];
}

export function variantIdForPlan(plan: CanonicalQuotePlan) {
  if (plan === 'starter') return env('LEMONSQUEEZY_VARIANT_PRO') || env('LEMONSQUEEZY_VARIANT_FOUNDER');
  if (plan === 'workshop') return env('LEMONSQUEEZY_VARIANT_WORKSHOP');
  return '';
}

export function planForVariantId(variantId: string | number | null | undefined): CanonicalQuotePlan | null {
  const value = String(variantId ?? '').trim();
  if (!value) return null;
  for (const [candidate, plan] of legacyVariantMappings()) {
    if (candidate && candidate === value) return plan;
  }
  return null;
}

export function checkoutConfigured(plan?: CanonicalQuotePlan) {
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
