-- Makster 1.1 — Supplier & Receiving
-- External cutting/edging/drilling order lifecycle, receiving, discrepancies and targeted rework.

begin;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  email text,
  phone text,
  address text,
  external_reference text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create index if not exists suppliers_org_name_idx on public.suppliers(organization_id, name);

create trigger suppliers_touch_updated_at
before update on public.suppliers
for each row execute function private.touch_updated_at();

-- 1.0 allowed only one supplier order per Production Pack. 1.1 supports reorders/rework,
-- therefore the Production Pack can have more than one external order over its lifetime.
alter table public.outsource_production_orders
  drop constraint if exists outsource_production_orders_production_pack_id_key;

alter table public.outsource_production_orders
  drop constraint if exists outsource_production_orders_status_check;
alter table public.outsource_production_orders
  add constraint outsource_production_orders_status_check
  check (status in ('draft','sent','accepted','in_production','ready','partially_received','received','cancelled'));

alter table public.outsource_production_orders
  drop constraint if exists outsource_orders_id_org_unique;
alter table public.outsource_production_orders
  add constraint outsource_orders_id_org_unique unique(id, organization_id);

alter table public.outsource_production_orders
  add column if not exists supplier_id uuid,
  add column if not exists order_version text not null default '1.1.0',
  add column if not exists production_pack_manifest_sha256 text,
  add column if not exists sent_by uuid references auth.users(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists cancelled_at timestamptz;

alter table public.outsource_production_orders
  drop constraint if exists outsource_orders_supplier_fk;
alter table public.outsource_production_orders
  add constraint outsource_orders_supplier_fk
  foreign key (supplier_id, organization_id)
  references public.suppliers(id, organization_id)
  on delete restrict;

alter table public.outsource_production_orders
  drop constraint if exists outsource_orders_manifest_sha_chk;
alter table public.outsource_production_orders
  add constraint outsource_orders_manifest_sha_chk
  check (production_pack_manifest_sha256 is null or char_length(production_pack_manifest_sha256)=64);

create index if not exists outsource_orders_supplier_idx
  on public.outsource_production_orders(organization_id, supplier_id, created_at desc);

create table if not exists public.outsource_production_order_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null,
  line_id text not null,
  part_id text not null,
  part_name text not null,
  quantity integer not null check (quantity > 0),
  length_mm numeric(12,1) not null check (length_mm >= 0),
  width_mm numeric(12,1) not null check (width_mm >= 0),
  thickness_mm numeric(12,1) not null check (thickness_mm >= 0),
  material_label text not null,
  services text[] not null,
  label_prefix text not null,
  created_at timestamptz not null default now(),
  foreign key (order_id, organization_id)
    references public.outsource_production_orders(id, organization_id)
    on delete cascade,
  unique(order_id, part_id)
);

create index if not exists outsource_order_lines_order_idx
  on public.outsource_production_order_lines(order_id);

create table if not exists public.outsource_production_order_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  order_id uuid not null,
  event_type text not null check (event_type in ('created','sent','accepted','in_production','ready','partially_received','received','cancelled','quote_updated','note')),
  actor_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object'),
  created_at timestamptz not null default now(),
  foreign key (order_id, organization_id)
    references public.outsource_production_orders(id, organization_id)
    on delete cascade
);

create index if not exists outsource_order_events_order_idx
  on public.outsource_production_order_events(order_id, created_at);

create table if not exists public.supplier_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null,
  received_by uuid references auth.users(id) on delete set null,
  note text,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (order_id, organization_id)
    references public.outsource_production_orders(id, organization_id)
    on delete restrict,
  unique(id, organization_id)
);

create index if not exists supplier_receipts_order_idx on public.supplier_receipts(order_id, received_at);

create table if not exists public.supplier_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  receipt_id uuid not null,
  order_id uuid not null,
  part_id text not null,
  quantity integer not null check (quantity > 0),
  disposition text not null check (disposition in ('accepted','damaged','missing','wrong_size','wrong_material','wrong_edge','wrong_drilling','other')),
  note text,
  photo_file_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (receipt_id, organization_id)
    references public.supplier_receipts(id, organization_id)
    on delete cascade,
  foreign key (order_id, organization_id)
    references public.outsource_production_orders(id, organization_id)
    on delete restrict
);

create index if not exists supplier_receipt_lines_order_part_idx
  on public.supplier_receipt_lines(order_id, part_id);

create table if not exists public.supplier_rework_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  source_order_id uuid not null,
  replacement_order_id uuid,
  project_id uuid not null references public.projects(id) on delete restrict,
  revision_number integer not null check (revision_number >= 1),
  status text not null default 'draft' check (status in ('draft','sent','accepted','in_production','ready','received','cancelled')),
  rework_json jsonb not null check (jsonb_typeof(rework_json)='object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (source_order_id, organization_id)
    references public.outsource_production_orders(id, organization_id)
    on delete restrict,
  foreign key (replacement_order_id, organization_id)
    references public.outsource_production_orders(id, organization_id)
    on delete set null,
  unique(id, organization_id)
);

create index if not exists supplier_rework_source_idx on public.supplier_rework_orders(source_order_id, created_at desc);

create trigger supplier_rework_touch_updated_at
before update on public.supplier_rework_orders
for each row execute function private.touch_updated_at();

-- RLS: browser clients may inspect their organization's supply chain; mutations stay server-side.
alter table public.suppliers enable row level security;
alter table public.outsource_production_order_lines enable row level security;
alter table public.outsource_production_order_events enable row level security;
alter table public.supplier_receipts enable row level security;
alter table public.supplier_receipt_lines enable row level security;
alter table public.supplier_rework_orders enable row level security;

create policy suppliers_select_org on public.suppliers for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy outsource_order_lines_select_org on public.outsource_production_order_lines for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy outsource_order_events_select_org on public.outsource_production_order_events for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy supplier_receipts_select_org on public.supplier_receipts for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy supplier_receipt_lines_select_org on public.supplier_receipt_lines for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy supplier_rework_select_org on public.supplier_rework_orders for select to authenticated
using ((select private.is_org_member(organization_id)));

revoke all on table public.suppliers from anon, authenticated;
revoke all on table public.outsource_production_order_lines from anon, authenticated;
revoke all on table public.outsource_production_order_events from anon, authenticated;
revoke all on table public.supplier_receipts from anon, authenticated;
revoke all on table public.supplier_receipt_lines from anon, authenticated;
revoke all on table public.supplier_rework_orders from anon, authenticated;

grant select on table public.suppliers to authenticated;
grant select on table public.outsource_production_order_lines to authenticated;
grant select on table public.outsource_production_order_events to authenticated;
grant select on table public.supplier_receipts to authenticated;
grant select on table public.supplier_receipt_lines to authenticated;
grant select on table public.supplier_rework_orders to authenticated;

grant select,insert,update on table public.suppliers to service_role;
grant select,insert on table public.outsource_production_order_lines to service_role;
grant select,insert on table public.outsource_production_order_events to service_role;
grant select,insert on table public.supplier_receipts to service_role;
grant select,insert on table public.supplier_receipt_lines to service_role;
grant select,insert,update on table public.supplier_rework_orders to service_role;

commit;
