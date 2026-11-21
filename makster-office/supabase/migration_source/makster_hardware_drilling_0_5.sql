-- Makster Engineering 0.5 / Hardware Drilling Intelligence
-- Migration body only. Create a real timestamped migration with:
--   supabase migration new makster_hardware_drilling_0_5
--
-- Live Supabase is intentionally not modified by this artifact build.

begin;

create table if not exists public.hardware_manufacturing_profiles (
  id uuid primary key default gen_random_uuid(),
  manufacturer text not null check (char_length(manufacturer) between 1 and 100),
  hardware_code text not null check (char_length(hardware_code) between 1 and 120),
  profile_kind text not null check (profile_kind in ('runner_cabinet_drilling','hinge_drilling','lift_drilling','other')),
  catalog_version text not null check (char_length(catalog_version) between 1 and 80),
  source_kind text not null check (source_kind in ('manufacturer_catalog','manufacturer_bxf','manual_verified')),
  source_url text,
  pattern_json jsonb not null check (jsonb_typeof(pattern_json) = 'object'),
  is_verified boolean not null default false,
  checksum text not null check (char_length(checksum) between 8 and 128),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hardware_manufacturing_profile_unique unique (manufacturer, hardware_code, profile_kind, catalog_version, checksum)
);

create index if not exists hardware_manufacturing_profiles_lookup_idx
  on public.hardware_manufacturing_profiles(manufacturer, hardware_code, profile_kind, is_verified, catalog_version);

alter table public.hardware_manufacturing_profiles enable row level security;

revoke all on table public.hardware_manufacturing_profiles from anon;
grant select on table public.hardware_manufacturing_profiles to authenticated;
grant select, insert, update, delete on table public.hardware_manufacturing_profiles to service_role;

create policy "verified manufacturing profiles readable by authenticated users"
  on public.hardware_manufacturing_profiles
  for select
  to authenticated
  using (is_verified = true);

-- Exact manufacturer drilling profiles are curated server-side only.
-- Authenticated users can read verified data but cannot publish or edit it.

commit;
