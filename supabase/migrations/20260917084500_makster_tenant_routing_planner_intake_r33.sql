-- Makster Dream Planner R33 / Quote Planner Intake
-- Additive multi-tenant schema. No production data routing is seeded here.

create table if not exists public.makster_product_entitlements (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product text not null check (product in ('DREAM_PLANNER','QUOTE','PRO')),
  status text not null default 'inactive' check (status in ('inactive','trialing','active','paused','expired')),
  features jsonb not null default '{}'::jsonb check (jsonb_typeof(features)='object'),
  valid_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, product)
);
alter table public.makster_product_entitlements enable row level security;
drop policy if exists makster_product_entitlements_member_select on public.makster_product_entitlements;
create policy makster_product_entitlements_member_select on public.makster_product_entitlements for select to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id=makster_product_entitlements.organization_id and m.user_id=(select auth.uid()) and m.status='active')
);

create table if not exists public.makster_planner_deployments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  deployment_key text not null unique,
  name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','ARCHIVED')),
  routing_mode text not null default 'AUTO' check (routing_mode in ('AUTO','QUOTE','PRO')),
  site_origin text null,
  public_config jsonb not null default '{}'::jsonb check (jsonb_typeof(public_config)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.makster_planner_deployments enable row level security;
drop policy if exists makster_planner_deployments_service_only on public.makster_planner_deployments;
create policy makster_planner_deployments_service_only on public.makster_planner_deployments for all to service_role using (true) with check (true);

alter table public.makster_project_handoffs add column if not exists organization_id uuid null references public.organizations(id) on delete set null;
alter table public.makster_project_handoffs add column if not exists deployment_id uuid null references public.makster_planner_deployments(id) on delete set null;
alter table public.makster_project_handoffs add column if not exists lead_type text not null default 'DREAM_PLANNER';
alter table public.makster_project_handoffs add column if not exists intake_stage text not null default 'ESTIMATE_REVIEW';
alter table public.makster_project_handoffs add column if not exists contact_json jsonb not null default '{}'::jsonb;
alter table public.makster_project_handoffs add column if not exists idempotency_key text null;
create unique index if not exists makster_project_handoffs_idempotency_uidx on public.makster_project_handoffs(idempotency_key) where idempotency_key is not null;
create index if not exists makster_project_handoffs_org_status_idx on public.makster_project_handoffs(organization_id,status,created_at desc);

create table if not exists public.quote_planner_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  handoff_id uuid not null unique references public.makster_project_handoffs(id) on delete restrict,
  deployment_id uuid null references public.makster_planner_deployments(id) on delete set null,
  project_id uuid not null unique references public.projects(id) on delete cascade,
  source_project_id text not null,
  contract_version text not null,
  intake_stage text not null default 'ESTIMATE_REVIEW',
  status text not null default 'IMPORTED' check (status in ('IMPORTED','REVIEWED','SUPERSEDED','FAILED')),
  planner_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(planner_snapshot)='object'),
  pricing_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(pricing_snapshot)='object'),
  visualization_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(visualization_snapshot)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.quote_planner_imports enable row level security;
drop policy if exists quote_planner_imports_member_select on public.quote_planner_imports;
create policy quote_planner_imports_member_select on public.quote_planner_imports for select to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id=quote_planner_imports.organization_id and m.user_id=(select auth.uid()) and m.status='active')
);

alter table public.quote_cabinets drop constraint if exists quote_cabinets_dimension_source_check;
alter table public.quote_cabinets add constraint quote_cabinets_dimension_source_check check (dimension_source in ('standard','measurement','manual','planner'));

comment on table public.makster_product_entitlements is 'Organization-level product entitlements shared by Dream Planner, Makster Quote and Makster Pro.';
comment on table public.makster_planner_deployments is 'Public Dream Planner deployments. Routing is resolved server-side from organization entitlements.';
comment on table public.quote_planner_imports is 'Quote provenance for projects imported as complete Dream Planner designs. The canonical project remains public.projects.';
