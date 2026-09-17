-- Shared Dream Planner -> Quote / Pro contract tables.
-- This file makes the Quote branch reproducible even when the earlier Dream Planner R32
-- migration history was applied from a separate package. No tenant-specific data is seeded.

create table if not exists public.makster_commercial_pricebooks (
  revision text primary key,
  organization_id uuid null references public.organizations(id) on delete cascade,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  vat_rate numeric(6,5) not null default 0.21 check (vat_rate >= 0 and vat_rate <= 1),
  payload jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.makster_commercial_pricebooks enable row level security;
revoke all on table public.makster_commercial_pricebooks from public, anon, authenticated;
grant select on table public.makster_commercial_pricebooks to service_role;
drop policy if exists makster_commercial_pricebooks_service_read on public.makster_commercial_pricebooks;
create policy makster_commercial_pricebooks_service_read on public.makster_commercial_pricebooks for select to service_role using (true);
create unique index if not exists makster_commercial_pricebooks_one_active_per_org on public.makster_commercial_pricebooks(organization_id) where active=true and organization_id is not null;
create index if not exists makster_commercial_pricebooks_org_active_idx on public.makster_commercial_pricebooks(organization_id,active,created_at desc);

create table if not exists public.makster_project_handoffs (
  id uuid primary key default gen_random_uuid(),
  destination text not null check (destination in ('QUOTE','PRO')),
  source_project_id text not null,
  project_name text not null,
  pricebook_revision text not null,
  total_gross numeric(14,2) not null default 0,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','FAILED','CANCELLED')),
  contract jsonb not null,
  consumer_ref text,
  error_message text,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);
alter table public.makster_project_handoffs enable row level security;
revoke all on table public.makster_project_handoffs from public, anon, authenticated;
grant select,insert,update on table public.makster_project_handoffs to service_role;
drop policy if exists makster_project_handoffs_service_all on public.makster_project_handoffs;
create policy makster_project_handoffs_service_all on public.makster_project_handoffs for all to service_role using (true) with check (true);
create index if not exists makster_project_handoffs_queue_idx on public.makster_project_handoffs(destination,status,created_at);
create index if not exists makster_project_handoffs_project_idx on public.makster_project_handoffs(source_project_id,created_at desc);
