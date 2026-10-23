alter table public.quote_subscriptions
  add column if not exists provider_variant_id text,
  add column if not exists provider_updated_at timestamptz,
  add column if not exists test_mode boolean not null default false;

create unique index if not exists quote_subscriptions_provider_subscription_uidx
  on public.quote_subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists quote_subscriptions_provider_customer_idx
  on public.quote_subscriptions (provider, provider_customer_id)
  where provider_customer_id is not null;

create table if not exists public.quote_billing_events (
  event_key text primary key,
  event_name text not null,
  resource_type text not null,
  resource_id text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  provider_updated_at timestamptz,
  test_mode boolean not null default false,
  received_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  processed_at timestamptz,
  error_text text
);

create index if not exists quote_billing_events_org_received_idx
  on public.quote_billing_events (organization_id, received_at desc);
create index if not exists quote_billing_events_unprocessed_idx
  on public.quote_billing_events (received_at)
  where processed_at is null;

alter table public.quote_billing_events enable row level security;

revoke all on public.quote_billing_events from anon, authenticated;

-- Billing state is read by organization members through the existing
-- quote_subscriptions SELECT policy. Writes are intentionally reserved for
-- the server-side service role used by the verified Lemon Squeezy webhook.
