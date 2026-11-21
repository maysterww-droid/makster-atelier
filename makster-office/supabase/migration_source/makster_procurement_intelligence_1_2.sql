-- Makster 1.2 — Supplier Intelligence & Procurement
-- Multi-supplier RFQ, quote comparison, performance snapshots and auditable award -> Supplier Order.

begin;

create table if not exists public.supplier_capability_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  currencies text[] not null default '{}',
  services text[] not null default '{}',
  delivery_modes text[] not null default '{}',
  minimum_order numeric(14,2),
  typical_lead_days numeric(8,2),
  capability_json jsonb not null default '{}'::jsonb check (jsonb_typeof(capability_json)='object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (supplier_id, organization_id) references public.suppliers(id, organization_id) on delete cascade,
  unique (supplier_id, organization_id)
);

create index if not exists supplier_capability_org_idx on public.supplier_capability_profiles(organization_id, active);
create trigger supplier_capability_touch_updated_at before update on public.supplier_capability_profiles
for each row execute function private.touch_updated_at();

create table if not exists public.supplier_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  completed_orders integer not null default 0 check (completed_orders >= 0),
  on_time_orders integer not null default 0 check (on_time_orders >= 0),
  received_units integer not null default 0 check (received_units >= 0),
  problem_units integer not null default 0 check (problem_units >= 0),
  rework_orders integer not null default 0 check (rework_orders >= 0),
  on_time_rate numeric(7,4) not null check (on_time_rate between 0 and 1),
  problem_rate numeric(7,4) not null check (problem_rate between 0 and 1),
  rework_rate numeric(7,4) not null check (rework_rate between 0 and 1),
  quality_score numeric(7,2) not null check (quality_score between 0 and 100),
  source_until timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (supplier_id, organization_id) references public.suppliers(id, organization_id) on delete cascade
);

create index if not exists supplier_performance_supplier_idx on public.supplier_performance_snapshots(organization_id, supplier_id, source_until desc);

create table if not exists public.procurement_rfqs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete restrict,
  revision_number integer not null check (revision_number >= 1),
  production_pack_id uuid not null,
  production_pack_manifest_sha256 text not null check (char_length(production_pack_manifest_sha256)=64),
  outsource_preset text not null check (outsource_preset in ('cutting_only','cutting_edging','cutting_edging_drilling')),
  services text[] not null,
  currency text not null check (char_length(currency)=3),
  delivery_required boolean not null default false,
  status text not null default 'open' check (status in ('draft','open','closed','awarded','cancelled')),
  response_deadline timestamptz,
  notes text,
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(id, organization_id),
  foreign key (production_pack_id, organization_id) references public.production_packs(id, organization_id) on delete restrict
);

create index if not exists procurement_rfqs_project_idx on public.procurement_rfqs(organization_id, project_id, requested_at desc);
create index if not exists procurement_rfqs_status_idx on public.procurement_rfqs(organization_id, status, response_deadline);

create table if not exists public.procurement_rfq_suppliers (
  organization_id uuid not null,
  rfq_id uuid not null,
  supplier_id uuid not null,
  invitation_status text not null default 'invited' check (invitation_status in ('invited','opened','responded','declined','expired')),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key(rfq_id, supplier_id),
  foreign key (rfq_id, organization_id) references public.procurement_rfqs(id, organization_id) on delete cascade,
  foreign key (supplier_id, organization_id) references public.suppliers(id, organization_id) on delete restrict
);

create index if not exists procurement_rfq_suppliers_supplier_idx on public.procurement_rfq_suppliers(organization_id, supplier_id, invited_at desc);

create table if not exists public.procurement_supplier_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  rfq_id uuid not null,
  supplier_id uuid not null,
  status text not null default 'submitted' check (status in ('draft','submitted','declined','expired','awarded','not_selected')),
  currency text not null check (char_length(currency)=3),
  base_price numeric(14,2) not null check (base_price >= 0),
  delivery_price numeric(14,2) not null default 0 check (delivery_price >= 0),
  total_price numeric(14,2) not null check (total_price >= 0),
  lead_days numeric(8,2) not null check (lead_days > 0),
  promised_at timestamptz,
  valid_until timestamptz,
  services text[] not null,
  delivery_mode text not null check (delivery_mode in ('pickup','supplier_delivery','carrier')),
  exclusions text[] not null default '{}',
  note text,
  quote_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(quote_payload)='object'),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(id, organization_id),
  foreign key (rfq_id, organization_id) references public.procurement_rfqs(id, organization_id) on delete cascade,
  foreign key (supplier_id, organization_id) references public.suppliers(id, organization_id) on delete restrict,
  unique(rfq_id, supplier_id, id)
);

create index if not exists procurement_quotes_rfq_idx on public.procurement_supplier_quotes(rfq_id, status, total_price);

create table if not exists public.procurement_comparisons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  rfq_id uuid not null,
  strategy text not null check (strategy in ('balanced','cheapest','fastest','quality_first')),
  weights_json jsonb not null check (jsonb_typeof(weights_json)='object'),
  comparison_json jsonb not null check (jsonb_typeof(comparison_json)='object'),
  recommended_quote_id uuid,
  generated_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  foreign key (rfq_id, organization_id) references public.procurement_rfqs(id, organization_id) on delete cascade,
  foreign key (recommended_quote_id, organization_id) references public.procurement_supplier_quotes(id, organization_id) on delete set null
);

create index if not exists procurement_comparisons_rfq_idx on public.procurement_comparisons(rfq_id, generated_at desc);

create table if not exists public.procurement_awards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  rfq_id uuid not null,
  quote_id uuid not null,
  supplier_id uuid not null,
  supplier_order_id uuid,
  awarded_by uuid references auth.users(id) on delete set null,
  awarded_at timestamptz not null default now(),
  award_note text,
  foreign key (rfq_id, organization_id) references public.procurement_rfqs(id, organization_id) on delete restrict,
  foreign key (quote_id, organization_id) references public.procurement_supplier_quotes(id, organization_id) on delete restrict,
  foreign key (supplier_id, organization_id) references public.suppliers(id, organization_id) on delete restrict,
  foreign key (supplier_order_id, organization_id) references public.outsource_production_orders(id, organization_id) on delete set null,
  unique(rfq_id)
);

-- Browser clients may read procurement data for their organization; all mutations remain server-side in 1.2.
alter table public.supplier_capability_profiles enable row level security;
alter table public.supplier_performance_snapshots enable row level security;
alter table public.procurement_rfqs enable row level security;
alter table public.procurement_rfq_suppliers enable row level security;
alter table public.procurement_supplier_quotes enable row level security;
alter table public.procurement_comparisons enable row level security;
alter table public.procurement_awards enable row level security;

create policy supplier_capability_select_org on public.supplier_capability_profiles for select to authenticated using ((select private.is_org_member(organization_id)));
create policy supplier_performance_select_org on public.supplier_performance_snapshots for select to authenticated using ((select private.is_org_member(organization_id)));
create policy procurement_rfqs_select_org on public.procurement_rfqs for select to authenticated using ((select private.is_org_member(organization_id)));
create policy procurement_rfq_suppliers_select_org on public.procurement_rfq_suppliers for select to authenticated using ((select private.is_org_member(organization_id)));
create policy procurement_quotes_select_org on public.procurement_supplier_quotes for select to authenticated using ((select private.is_org_member(organization_id)));
create policy procurement_comparisons_select_org on public.procurement_comparisons for select to authenticated using ((select private.is_org_member(organization_id)));
create policy procurement_awards_select_org on public.procurement_awards for select to authenticated using ((select private.is_org_member(organization_id)));

revoke all on table public.supplier_capability_profiles from anon, authenticated;
revoke all on table public.supplier_performance_snapshots from anon, authenticated;
revoke all on table public.procurement_rfqs from anon, authenticated;
revoke all on table public.procurement_rfq_suppliers from anon, authenticated;
revoke all on table public.procurement_supplier_quotes from anon, authenticated;
revoke all on table public.procurement_comparisons from anon, authenticated;
revoke all on table public.procurement_awards from anon, authenticated;

grant select on table public.supplier_capability_profiles to authenticated;
grant select on table public.supplier_performance_snapshots to authenticated;
grant select on table public.procurement_rfqs to authenticated;
grant select on table public.procurement_rfq_suppliers to authenticated;
grant select on table public.procurement_supplier_quotes to authenticated;
grant select on table public.procurement_comparisons to authenticated;
grant select on table public.procurement_awards to authenticated;

grant select,insert,update on table public.supplier_capability_profiles to service_role;
grant select,insert on table public.supplier_performance_snapshots to service_role;
grant select,insert,update on table public.procurement_rfqs to service_role;
grant select,insert,update on table public.procurement_rfq_suppliers to service_role;
grant select,insert,update on table public.procurement_supplier_quotes to service_role;
grant select,insert on table public.procurement_comparisons to service_role;
grant select,insert,update on table public.procurement_awards to service_role;

commit;
