create table if not exists public.quote_price_book_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null check (category in ('board','front','edge','hardware','operation','labour','delivery','installation','overhead','other')),
  name text not null,
  manufacturer text,
  sku text,
  unit text not null default 'pcs',
  currency text not null,
  purchase_price_minor bigint not null default 0 check (purchase_price_minor >= 0),
  sell_price_minor bigint check (sell_price_minor is null or sell_price_minor >= 0),
  parameters_json jsonb not null default '{}'::jsonb,
  source text not null default 'manual' check (source in ('manual','csv','catalog','supplier','system')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_price_book_items_org_category_idx
  on public.quote_price_book_items (organization_id, category, active);
create index if not exists quote_price_book_items_org_sku_idx
  on public.quote_price_book_items (organization_id, sku)
  where sku is not null;

create table if not exists public.quote_cabinets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_revision_id uuid references public.project_revisions(id) on delete set null,
  module_key text not null,
  name text not null,
  sort_order integer not null default 0,
  width_mm numeric(10,2) not null check (width_mm > 0),
  height_mm numeric(10,2) not null check (height_mm > 0),
  depth_mm numeric(10,2) not null check (depth_mm > 0),
  quantity integer not null default 1 check (quantity > 0),
  construction_json jsonb not null default '{}'::jsonb,
  material_refs_json jsonb not null default '{}'::jsonb,
  hardware_refs_json jsonb not null default '{}'::jsonb,
  computed_parts_json jsonb not null default '[]'::jsonb,
  computed_cost_json jsonb not null default '{}'::jsonb,
  engine_version text not null default 'mq-0.1',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_cabinets_org_project_idx
  on public.quote_cabinets (organization_id, project_id, sort_order);

create table if not exists public.quote_subscriptions (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null default 'lemonsqueezy' check (provider in ('lemonsqueezy','manual')),
  plan text not null default 'free' check (plan in ('free','founder','pro','workshop')),
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','paused','cancelled','expired')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quote_price_book_items enable row level security;
alter table public.quote_cabinets enable row level security;
alter table public.quote_subscriptions enable row level security;

create policy "quote_price_book_select_org"
on public.quote_price_book_items for select
to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_price_book_items.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
));

create policy "quote_price_book_insert_admin"
on public.quote_price_book_items for insert
to authenticated
with check (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_price_book_items.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
    and om.role in ('owner','admin')
));

create policy "quote_price_book_update_admin"
on public.quote_price_book_items for update
to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_price_book_items.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
    and om.role in ('owner','admin')
))
with check (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_price_book_items.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
    and om.role in ('owner','admin')
));

create policy "quote_price_book_delete_admin"
on public.quote_price_book_items for delete
to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_price_book_items.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
    and om.role in ('owner','admin')
));

create policy "quote_cabinets_select_org"
on public.quote_cabinets for select
to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_cabinets.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
));

create policy "quote_cabinets_insert_editor"
on public.quote_cabinets for insert
to authenticated
with check (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_cabinets.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
    and om.role in ('owner','admin','sales','designer','technologist')
));

create policy "quote_cabinets_update_editor"
on public.quote_cabinets for update
to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_cabinets.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
    and om.role in ('owner','admin','sales','designer','technologist')
))
with check (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_cabinets.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
    and om.role in ('owner','admin','sales','designer','technologist')
));

create policy "quote_cabinets_delete_editor"
on public.quote_cabinets for delete
to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_cabinets.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
    and om.role in ('owner','admin','sales','designer','technologist')
));

create policy "quote_subscriptions_select_org"
on public.quote_subscriptions for select
to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_subscriptions.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
));

grant select, insert, update, delete on public.quote_price_book_items to authenticated;
grant select, insert, update, delete on public.quote_cabinets to authenticated;
grant select on public.quote_subscriptions to authenticated;
