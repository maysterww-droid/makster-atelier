
-- Makster AI 4.2.0 — Production Capacity + Procurement Award + Cash Commitments
-- PREPARED MIGRATION. Apply after makster_owner_operations_4_1.sql in staging.

begin;

alter table public.owner_cash_events
  add column if not exists source text not null default 'manual'
    check (source in ('manual','procurement_award','project')),
  add column if not exists source_id text;

create index if not exists owner_cash_events_source_idx
  on public.owner_cash_events(organization_id,source,source_id);

create table if not exists public.owner_production_work_centers (
  id text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('cutting','edging','drilling','assembly','installation')),
  daily_capacity_hours numeric(10,2) not null check (daily_capacity_hours > 0),
  active boolean not null default true,
  workdays integer[] not null default '{1,2,3,4,5}',
  updated_at timestamptz not null default now(),
  primary key(organization_id,id),
  unique(organization_id,kind)
);

create table if not exists public.owner_project_capacity_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  center_kind text not null check (center_kind in ('cutting','edging','drilling','assembly','installation')),
  hours numeric(12,2) not null check (hours >= 0),
  note text,
  updated_at timestamptz not null default now(),
  unique(organization_id,project_id,center_kind)
);

create table if not exists public.owner_procurement_awards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.owner_supplier_quotes(id) on delete restrict,
  supplier_id uuid not null references public.owner_supplier_profiles(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  sku text not null,
  quantity numeric(16,3) not null check (quantity > 0),
  unit text not null check (unit in ('pcs','set','m2','m','mm','service')),
  currency text not null check (char_length(currency)=3),
  total_cost_minor bigint not null check (total_cost_minor >= 0),
  payment_due_at timestamptz not null,
  expected_at timestamptz not null,
  status text not null default 'pending_project_order'
    check (status in ('pending_project_order','ordered','failed','cancelled')),
  purchase_order_id uuid,
  cash_event_id uuid references public.owner_cash_events(id) on delete set null,
  awarded_by text not null,
  awarded_at timestamptz not null default now(),
  error text
);
create index if not exists owner_procurement_awards_project_idx
  on public.owner_procurement_awards(organization_id,project_id,awarded_at desc);
create unique index if not exists owner_procurement_awards_active_quote_project_sku_uq
  on public.owner_procurement_awards(organization_id,quote_id,project_id,sku)
  where status in ('pending_project_order','ordered');

alter table public.owner_production_work_centers enable row level security;
alter table public.owner_project_capacity_overrides enable row level security;
alter table public.owner_procurement_awards enable row level security;

create policy owner_production_work_centers_select
on public.owner_production_work_centers for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));

create policy owner_project_capacity_overrides_select
on public.owner_project_capacity_overrides for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));

create policy owner_procurement_awards_select
on public.owner_procurement_awards for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));

revoke all on table
  public.owner_production_work_centers,
  public.owner_project_capacity_overrides,
  public.owner_procurement_awards
from anon,authenticated;

grant select on table
  public.owner_production_work_centers,
  public.owner_project_capacity_overrides,
  public.owner_procurement_awards
to authenticated;

grant select,insert,update,delete on table
  public.owner_production_work_centers,
  public.owner_project_capacity_overrides,
  public.owner_procurement_awards
to service_role;

commit;
