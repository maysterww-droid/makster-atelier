import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { PAID_PLANS, type QuotePlan } from '@/lib/billing';
import {
  normalizeStripeStatus,
  planForStripePriceId,
  stripeGet,
  stripeWebhookSecret,
} from '@/lib/stripe-billing';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const acceptedEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]);

function isUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validPlan(value: unknown): QuotePlan | null {
  const plan = String(value ?? '').trim() as QuotePlan;
  return PAID_PLANS.includes(plan) ? plan : null;
}

function safeEqualHex(left: string, right: string) {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) return false;
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function validSignature(body: string, header: string, secret: string) {
  const parts = header.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2) ?? '';
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  const epoch = Number(timestamp);
  if (!Number.isFinite(epoch) || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - epoch) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return signatures.some((signature) => safeEqualHex(expected, signature));
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function objectId(value: unknown) {
  if (typeof value === 'string') return stringValue(value);
  if (value && typeof value === 'object') return stringValue((value as { id?: unknown }).id);
  return null;
}

type StripeEvent = {
  id?: string;
  type?: string;
  created?: number;
  livemode?: boolean;
  data?: { object?: Record<string, unknown> };
};

type StripeSubscriptionItem = {
  current_period_end?: number;
  price?: { id?: string };
};

type StripeSubscription = Record<string, unknown> & {
  id?: string;
  customer?: string | { id?: string };
  status?: string;
  metadata?: Record<string, unknown>;
  items?: { data?: StripeSubscriptionItem[] };
};

function subscriptionIdFromObject(object: Record<string, unknown>) {
  const direct = objectId(object.subscription);
  if (direct) return direct;

  const parent = object.parent && typeof object.parent === 'object'
    ? object.parent as Record<string, unknown>
    : null;
  const subscriptionDetails = parent?.subscription_details && typeof parent.subscription_details === 'object'
    ? parent.subscription_details as Record<string, unknown>
    : null;
  return objectId(subscriptionDetails?.subscription);
}

async function resolveSubscription(eventName: string, object: Record<string, unknown>) {
  if (eventName.startsWith('customer.subscription.')) {
    return object as StripeSubscription;
  }

  const subscriptionId = subscriptionIdFromObject(object);
  if (!subscriptionId) return null;
  const response = await stripeGet(`subscriptions/${encodeURIComponent(subscriptionId)}`);
  if (!response?.ok) return null;
  return await response.json() as StripeSubscription;
}

function subscriptionPeriodEnd(subscription: StripeSubscription) {
  const values = (subscription.items?.data ?? [])
    .map((item) => Number(item.current_period_end ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) return null;
  return new Date(Math.max(...values) * 1000).toISOString();
}

export async function POST(request: Request) {
  const secret = stripeWebhookSecret();
  if (!secret) return NextResponse.json({ error: 'webhook-not-configured' }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';
  if (!signature || !validSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid-signature' }, { status: 401 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  const eventId = stringValue(event.id);
  const eventName = stringValue(event.type);
  const object = event.data?.object ?? {};
  if (!eventId || !eventName) return NextResponse.json({ error: 'invalid-event' }, { status: 400 });
  if (!acceptedEvents.has(eventName)) return NextResponse.json({ ok: true, ignored: true }, { status: 202 });

  const subscription = await resolveSubscription(eventName, object);
  if (!subscription?.id) {
    if (eventName.startsWith('invoice.')) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'non-subscription-invoice' }, { status: 202 });
    }
    return NextResponse.json({ error: 'subscription-not-found' }, { status: 422 });
  }

  const sessionMetadata = object.metadata && typeof object.metadata === 'object' ? object.metadata as Record<string, unknown> : {};
  const subscriptionMetadata = subscription.metadata ?? {};
  const organizationId = stringValue(subscriptionMetadata.organization_id)
    ?? stringValue(sessionMetadata.organization_id)
    ?? stringValue(object.client_reference_id);
  if (!isUuid(organizationId)) return NextResponse.json({ error: 'organization-not-found' }, { status: 422 });

  const priceId = stringValue(subscription.items?.data?.[0]?.price?.id);
  const plan = validPlan(subscriptionMetadata.plan)
    ?? validPlan(sessionMetadata.plan)
    ?? planForStripePriceId(priceId);
  if (!plan) return NextResponse.json({ error: 'price-not-mapped' }, { status: 422 });

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : stringValue(subscription.customer?.id);
  const providerUpdatedAt = event.created
    ? new Date(event.created * 1000).toISOString()
    : new Date().toISOString();
  const currentPeriodEnd = subscriptionPeriodEnd(subscription);
  const providerStatus = eventName === 'customer.subscription.deleted'
    ? 'cancelled'
    : normalizeStripeStatus(subscription.status);
  const testMode = event.livemode === false;
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existingEvent, error: eventReadError } = await admin
    .from('quote_billing_events')
    .select('processed_at')
    .eq('event_key', eventId)
    .maybeSingle();
  if (eventReadError) return NextResponse.json({ error: 'event-read-failed' }, { status: 500 });
  if (existingEvent?.processed_at) return NextResponse.json({ ok: true, duplicate: true });

  const { error: eventUpsertError } = await admin
    .from('quote_billing_events')
    .upsert({
      event_key: eventId,
      event_name: eventName,
      resource_type: 'subscriptions',
      resource_id: subscription.id,
      organization_id: organizationId,
      provider_updated_at: providerUpdatedAt,
      test_mode: testMode,
      last_attempt_at: now,
      error_text: null,
    }, { onConflict: 'event_key' });
  if (eventUpsertError) return NextResponse.json({ error: 'event-log-failed' }, { status: 500 });

  const { data: current, error: currentError } = await admin
    .from('quote_subscriptions')
    .select('provider_updated_at')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (currentError) {
    await admin.from('quote_billing_events').update({ error_text: currentError.message, last_attempt_at: now }).eq('event_key', eventId);
    return NextResponse.json({ error: 'subscription-read-failed' }, { status: 500 });
  }

  const existingUpdated = current?.provider_updated_at ? new Date(current.provider_updated_at).getTime() : 0;
  const incomingUpdated = new Date(providerUpdatedAt).getTime();
  if (existingUpdated && Number.isFinite(incomingUpdated) && incomingUpdated < existingUpdated) {
    await admin.from('quote_billing_events').update({ processed_at: now, error_text: 'ignored-stale-event' }).eq('event_key', eventId);
    return NextResponse.json({ ok: true, stale: true });
  }

  const { error: syncError } = await admin
    .from('quote_subscriptions')
    .upsert({
      organization_id: organizationId,
      provider: 'stripe',
      plan,
      status: providerStatus,
      provider_customer_id: customerId,
      provider_subscription_id: subscription.id,
      provider_variant_id: priceId,
      provider_updated_at: providerUpdatedAt,
      current_period_end: currentPeriodEnd,
      test_mode: testMode,
      metadata_json: {
        priceId,
        lastEvent: eventName,
        stripeEventId: eventId,
      },
      updated_at: now,
    }, { onConflict: 'organization_id' });

  if (syncError) {
    await admin.from('quote_billing_events').update({ error_text: syncError.message, last_attempt_at: now }).eq('event_key', eventId);
    return NextResponse.json({ error: 'subscription-sync-failed' }, { status: 500 });
  }

  await admin.from('quote_billing_events').update({ processed_at: now, error_text: null }).eq('event_key', eventId);
  return NextResponse.json({ ok: true });
}
