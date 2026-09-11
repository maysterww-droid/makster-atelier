'use server';

import { redirect } from 'next/navigation';
import {
  appBaseUrl,
  checkoutConfigured,
  lemonApiKey,
  lemonStoreId,
  lemonTestMode,
  PAID_PLANS,
  type QuotePlan,
  variantIdForPlan,
} from '@/lib/billing';
import { requireWorkspace } from '@/lib/workspace';

const billingRoles = new Set(['owner', 'admin']);

function cleanPlan(value: FormDataEntryValue | null): QuotePlan | null {
  const plan = String(value ?? '').trim() as QuotePlan;
  return PAID_PLANS.includes(plan) ? plan : null;
}

export async function startCheckout(formData: FormData) {
  const { supabase, organization, userId, role } = await requireWorkspace();
  if (!billingRoles.has(role)) redirect('/settings/billing?error=permission');

  const plan = cleanPlan(formData.get('plan'));
  if (!plan) redirect('/settings/billing?error=plan');
  if (!checkoutConfigured(plan)) redirect('/settings/billing?error=config');

  const apiKey = lemonApiKey();
  const storeId = lemonStoreId();
  const variantId = variantIdForPlan(plan);
  const { data: authData } = await supabase.auth.getUser();
  const email = authData.user?.email ?? undefined;

  const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          test_mode: lemonTestMode(),
          product_options: {
            enabled_variants: [Number(variantId)],
            redirect_url: `${appBaseUrl()}/settings/billing?checkout=success`,
          },
          checkout_data: {
            ...(email ? { email } : {}),
            custom: {
              organization_id: organization.id,
              user_id: userId,
              plan,
            },
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    redirect(`/settings/billing?error=checkout-${response.status}`);
  }

  const payload = await response.json() as { data?: { attributes?: { url?: string } } };
  const url = payload.data?.attributes?.url;
  if (!url || !/^https:\/\//.test(url)) redirect('/settings/billing?error=checkout-url');
  redirect(url);
}

export async function openCustomerPortal() {
  const { supabase, organization, role } = await requireWorkspace();
  if (!billingRoles.has(role)) redirect('/settings/billing?error=permission');
  if (!lemonApiKey()) redirect('/settings/billing?error=config');

  const { data: subscription, error } = await supabase
    .from('quote_subscriptions')
    .select('provider, provider_subscription_id')
    .eq('organization_id', organization.id)
    .maybeSingle();

  if (error || subscription?.provider !== 'lemonsqueezy' || !subscription.provider_subscription_id) {
    redirect('/settings/billing?error=subscription');
  }

  const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(subscription.provider_subscription_id)}`, {
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${lemonApiKey()}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) redirect(`/settings/billing?error=portal-${response.status}`);
  const payload = await response.json() as { data?: { attributes?: { urls?: { customer_portal?: string } } } };
  const url = payload.data?.attributes?.urls?.customer_portal;
  if (!url || !/^https:\/\//.test(url)) redirect('/settings/billing?error=portal-url');
  redirect(url);
}
