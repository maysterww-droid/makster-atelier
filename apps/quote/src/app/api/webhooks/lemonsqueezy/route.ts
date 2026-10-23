import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  lemonWebhookSecret,
  normalizeLemonStatus,
  planForVariantId,
} from '@/lib/billing';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const subscriptionEvents = new Set([
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_expired',
  'subscription_paused',
  'subscription_unpaused',
  'subscription_plan_changed',
  'subscription_payment_failed',
  'subscription_payment_success',
  'subscription_payment_recovered',
]);

function isUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validSignature(body: string, signature: string, secret: string) {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');
  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

type LemonPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
    test_mode?: boolean;
  };
  data?: {
    type?: string;
    id?: string;
    attributes?: Record<string, unknown>;
  };
};

export async function POST(request: Request) {
  const secret = lemonWebhookSecret();
  if (!secret) return NextResponse.json({ error: 'webhook-not-configured' }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get('x-signature') ?? '';
  if (!signature || !validSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid-signature' }, { status: 401 });
  }

  let payload: LemonPayload;
  try {
    payload = JSON.parse(rawBody) as LemonPayload;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  const eventName = String(payload.meta?.event_name ?? request.headers.get('x-event-name') ?? '').trim();
  const resourceType = String(payload.data?.type ?? '').trim();
  const resourceId = String(payload.data?.id ?? '').trim();
  if (!eventName || !resourceType || !resourceId) {
    return NextResponse.json({ error: 'invalid-payload' }, { status: 400 });
  }

  if (!subscriptionEvents.has(eventName) || resourceType !== 'subscriptions') {
    return NextResponse.json({ ok: true, ignored: true }, { status: 202 });
  }

  const attributes = payload.data?.attributes ?? {};
  const custom = payload.meta?.custom_data ?? {};
  const organizationId = custom.organization_id;
  if (!isUuid(organizationId)) {
    return NextResponse.json({ error: 'organization-not-found' }, { status: 422 });
  }

  const variantId = stringValue(attributes.variant_id);
  const plan = planForVariantId(variantId);
  if (!plan) {
    return NextResponse.json({ error: 'variant-not-mapped' }, { status: 422 });
  }

  const providerUpdatedAt = stringValue(attributes.updated_at) ?? stringValue(attributes.created_at);
  const providerStatus = normalizeLemonStatus(attributes.status);
  const currentPeriodEnd = stringValue(attributes.ends_at) ?? stringValue(attributes.renews_at);
  const customerId = stringValue(attributes.customer_id);
  const productId = stringValue(attributes.product_id);
  const testMode = Boolean(attributes.test_mode ?? payload.meta?.test_mode ?? false);
  const eventKey = [eventName, resourceType, resourceId, providerUpdatedAt ?? '', providerStatus, variantId ?? ''].join(':');
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existingEvent, error: eventReadError } = await admin
    .from('quote_billing_events')
    .select('processed_at')
    .eq('event_key', eventKey)
    .maybeSingle();
  if (eventReadError) return NextResponse.json({ error: 'event-read-failed' }, { status: 500 });
  if (existingEvent?.processed_at) return NextResponse.json({ ok: true, duplicate: true });

  const { error: eventUpsertError } = await admin
    .from('quote_billing_events')
    .upsert({
      event_key: eventKey,
      event_name: eventName,
      resource_type: resourceType,
      resource_id: resourceId,
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
    await admin.from('quote_billing_events').update({ error_text: currentError.message, last_attempt_at: now }).eq('event_key', eventKey);
    return NextResponse.json({ error: 'subscription-read-failed' }, { status: 500 });
  }

  const existingUpdated = current?.provider_updated_at ? new Date(current.provider_updated_at).getTime() : 0;
  const incomingUpdated = providerUpdatedAt ? new Date(providerUpdatedAt).getTime() : Date.now();
  if (existingUpdated && Number.isFinite(incomingUpdated) && incomingUpdated < existingUpdated) {
    await admin.from('quote_billing_events').update({ processed_at: now, error_text: 'ignored-stale-event' }).eq('event_key', eventKey);
    return NextResponse.json({ ok: true, stale: true });
  }

  const { error: syncError } = await admin
    .from('quote_subscriptions')
    .upsert({
      organization_id: organizationId,
      provider: 'lemonsqueezy',
      plan,
      status: providerStatus,
      provider_customer_id: customerId,
      provider_subscription_id: resourceId,
      provider_variant_id: variantId,
      provider_updated_at: providerUpdatedAt,
      current_period_end: currentPeriodEnd,
      test_mode: testMode,
      metadata_json: {
        productId,
        variantId,
        lastEvent: eventName,
        userEmail: stringValue(attributes.user_email),
        cancelled: Boolean(attributes.cancelled ?? false),
      },
      updated_at: now,
    }, { onConflict: 'organization_id' });

  if (syncError) {
    await admin.from('quote_billing_events').update({ error_text: syncError.message, last_attempt_at: now }).eq('event_key', eventKey);
    return NextResponse.json({ error: 'subscription-sync-failed' }, { status: 500 });
  }

  await admin.from('quote_billing_events').update({ processed_at: now, error_text: null }).eq('event_key', eventKey);
  return NextResponse.json({ ok: true });
}
