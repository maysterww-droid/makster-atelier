-- Makster Engineering 0.4 / Blum Intelligence
-- Migration body only. Create a real timestamped migration with:
--   supabase migration new makster_blum_intelligence_0_4
--
-- Live Supabase is intentionally not modified by this artifact build.

begin;

alter table public.engineering_artifacts
  add column if not exists cnc_ready boolean not null default false;

-- Normalized manufacturer planning data. This is a curated technical index,
-- not a copy of a manufacturer's catalogue and not a user-editable table.
create table if not exists public.hardware_catalog_items (
  id uuid primary key default gen_random_uuid(),
  manufacturer text not null check (char_length(manufacturer) between 1 and 100),
  code text not null check (char_length(code) between 1 and 120),
  role text not null check (role in ('hinge','runner','lift','handle','rail','connector','leg','other')),
  name text not null check (char_length(name) between 1 and 240),
  catalog_version text not null check (char_length(catalog_version) between 1 and 80),
  technical_json jsonb not null check (jsonb_typeof(technical_json) = 'object'),
  source_url text,
  source_page text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hardware_catalog_unique unique (manufacturer, code, catalog_version)
);

create index if not exists hardware_catalog_lookup_idx
  on public.hardware_catalog_items(manufacturer, role, is_active, code);

alter table public.hardware_catalog_items enable row level security;

-- Explicit Data API grants. Manufacturer data is readable by signed-in Makster users;
-- catalogue writes remain server-side only.
revoke all on table public.hardware_catalog_items from anon;
grant select on table public.hardware_catalog_items to authenticated;
grant select, insert, update, delete on table public.hardware_catalog_items to service_role;

create policy "hardware catalog readable by authenticated users"
  on public.hardware_catalog_items
  for select
  to authenticated
  using (is_active = true);

-- engineering_artifacts remains immutable; only server workers write the new flag.
revoke update (cnc_ready) on public.engineering_artifacts from authenticated;
grant update (cnc_ready) on public.engineering_artifacts to service_role;

commit;
