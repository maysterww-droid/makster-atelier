'use server';

import { redirect } from 'next/navigation';
import { appBaseUrl, PAID_PLANS, type QuotePlan } from '@/lib/billing';
import {
  stripeCheckoutConfigured,
  stripeGet,
  stripePost,
  stripePriceIdForPlan,
} from '@/lib/stripe-billing';
import { requireWorkspace } from '@/lib/workspace';

const billingRoles = new Set(['owner', 'admin']);

function cleanPlan(value: FormDataEntryValue | null): QuotePlan | null {
  const plan = String(value ?? '').trim() as QuotePlan;
  return PAID_PLANS.includes(plan) ? plan : null;
}

function activeSubscription(subscription: { provider_subscription_id?: string | null; status?: string | null } | null | undefined) {
  return Boolean(
    subscription?.provider_subscription_id
    && subscription.status !== 'expired'
    && subscription.status !== 'inactive',
  );
}

export async function startCheckout(formData: FormData) {
  const { supabase, organization, userId, role } = await requireWorkspace();
  if (!billingRoles.has(role)) redirect('/settings/billing?error=permission');

  const plan = cleanPlan(formData.get('plan'));
  if (!plan) redirect('/settings/billing?error=plan');
  if (!stripeCheckoutConfigured(plan)) redirect('/settings/billing?error=config');

  const { data: currentSubscription, error: subscriptionError } = await supabase
    .from('quote_subscriptions')
    .select('provider, provider_subscription_id, status')
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (subscriptionError) redirect('/settings/billing?error=subscription-read');
  if (activeSubscription(currentSubscription)) {
    redirect('/settings/billing?error=existing-subscription');
  }

  const priceId = stripePriceIdForPlan(plan);
  const { data: authData } = await supabase.auth.getUser();
  const email = authData.user?.email?.trim();
  const successUrl = `${appBaseUrl()}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appBaseUrl()}/settings/billing?checkout=cancelled`;
  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('success_url', successUrl);
  params.set('cancel_url', cancelUrl);
  params.set('line_items[0][price]', priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('client_reference_id', organization.id);
  if (email) params.set('customer_email', email);
  params.set('metadata[organization_id]', organization.id);
  params.set('metadata[user_id]', userId);
  params.set('metadata[plan]', plan);
  params.set('subscription_data[metadata][organization_id]', organization.id);
  params.set('subscription_data[metadata][user_id]', userId);
  params.set('subscription_data[metadata][plan]', plan);

  const response = await stripePost('checkout/sessions', params);
  if (!response) redirect('/settings/billing?error=config');
  if (!response.ok) redirect(`/settings/billing?error=checkout-${response.status}`);

  const payload = await response.json() as { url?: string };
  if (!payload.url || !/^https:\/\//.test(payload.url)) {
    redirect('/settings/billing?error=checkout-url');
  }
  redirect(payload.url);
}

export async function openCustomerPortal() {
  const { supabase, organization, role } = await requireWorkspace();
  if (!billingRoles.has(role)) redirect('/settings/billing?error=permission');

  const { data: subscription, error } = await supabase
    .from('quote_subscriptions')
    .select('provider, provider_subscription_id, provider_customer_id')
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (error || subscription?.provider !== 'stripe' || !subscription.provider_subscription_id) {
    redirect('/settings/billing?error=subscription');
  }

  let customerId = String(subscription.provider_customer_id ?? '').trim();
  if (!customerId) {
    const subscriptionResponse = await stripeGet(`subscriptions/${encodeURIComponent(subscription.provider_subscription_id)}`);
    if (!subscriptionResponse?.ok) redirect('/settings/billing?error=portal-customer');
    const stripeSubscription = await subscriptionResponse.json() as { customer?: string | { id?: string } };
    customerId = typeof stripeSubscription.customer === 'string'
      ? stripeSubscription.customer
      : String(stripeSubscription.customer?.id ?? '').trim();
  }
  if (!customerId) redirect('/settings/billing?error=portal-customer');

  const params = new URLSearchParams();
  params.set('customer', customerId);
  params.set('return_url', `${appBaseUrl()}/settings/billing`);
  const response = await stripePost('billing_portal/sessions', params);
  if (!response) redirect('/settings/billing?error=config');
  if (!response.ok) redirect(`/settings/billing?error=portal-${response.status}`);

  const payload = await response.json() as { url?: string };
  if (!payload.url || !/^https:\/\//.test(payload.url)) {
    redirect('/settings/billing?error=portal-url');
  }
  redirect(payload.url);
}
