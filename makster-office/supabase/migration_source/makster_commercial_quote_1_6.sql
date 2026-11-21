-- Makster 1.6 — Commercial & Quote Engine
-- PREPARED MIGRATION ONLY. Not applied to live Supabase by this build.
-- Requires Makster Core organization/project tables and private.is_org_member/private.has_org_role helpers.

create table if not exists public.commercial_pricing_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  currency text not null,
  version integer not null check (version >= 1),
  status text not null default 'active' check (status in ('active','archived')),
  pricing_json jsonb not null,
  fingerprint_sha256 text not null check (fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name, version),
  unique (organization_id, fingerprint_sha256)
);

create table if not exists public.commercial_estimates (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_revision_id uuid references public.project_revisions(id) on delete restrict,
  project_revision integer not null check (project_revision >= 1),
  estimate_version integer not null check (estimate_version >= 1),
  currency text not null,
  pricing_profile_id uuid references public.commercial_pricing_profiles(id) on delete restrict,
  pricing_profile_fingerprint_sha256 text not null check (pricing_profile_fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  engineering_input_checksum text not null,
  production_pack_id uuid references public.production_packs(id) on delete restrict,
  ready boolean not null,
  estimate_fingerprint_sha256 text not null check (estimate_fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  direct_cost_minor bigint not null,
  overhead_minor bigint not null,
  total_cost_minor bigint not null,
  net_sales_minor bigint not null,
  tax_minor bigint not null,
  gross_sales_minor bigint not null,
  profit_minor bigint not null,
  margin_bps integer not null,
  markup_bps integer not null,
  estimate_json jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, project_id, estimate_version),
  unique (organization_id, estimate_fingerprint_sha256)
);

create table if not exists public.commercial_estimate_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  estimate_id uuid not null references public.commercial_estimates(id) on delete cascade,
  line_key text not null,
  category text not null check (category in ('material','edge','hardware','external_service','labor','transport','installation','overhead','other')),
  label text not null,
  quantity numeric not null,
  unit text not null,
  unit_cost_minor bigint not null,
  total_cost_minor bigint not null,
  source text not null check (source in ('price_catalog','supplier_quote','manual','derived','engineering')),
  source_reference text,
  target_id text,
  note text,
  unique (estimate_id, line_key)
);

create table if not exists public.client_commercial_quotes (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_revision_id uuid references public.project_revisions(id) on delete restrict,
  project_revision integer not null check (project_revision >= 1),
  estimate_id uuid not null references public.commercial_estimates(id) on delete restrict,
  quote_version integer not null check (quote_version >= 1),
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  currency text not null,
  issued_at timestamptz not null,
  valid_until timestamptz not null,
  net_amount_minor bigint not null,
  tax_minor bigint not null,
  total_amount_minor bigint not null,
  quote_fingerprint_sha256 text not null check (quote_fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  quote_json jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, project_id, quote_version),
  unique (organization_id, quote_fingerprint_sha256)
);

create table if not exists public.client_quote_status_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.client_commercial_quotes(id) on delete cascade,
  status text not null check (status in ('draft','sent','accepted','rejected','expired','superseded')),
  actor_id uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.commercial_packages (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  estimate_id uuid not null references public.commercial_estimates(id) on delete restrict,
  quote_id uuid not null references public.client_commercial_quotes(id) on delete restrict,
  manifest_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (quote_id)
);

create table if not exists public.commercial_package_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  package_id uuid not null references public.commercial_packages(id) on delete cascade,
  name text not null,
  media_type text not null,
  purpose text not null,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  byte_length bigint not null check (byte_length > 0),
  storage_path text,
  unique (package_id, name)
);

create index if not exists commercial_estimates_project_idx on public.commercial_estimates(project_id, project_revision desc, estimate_version desc);
create index if not exists client_commercial_quotes_project_idx on public.client_commercial_quotes(project_id, quote_version desc);
create index if not exists quote_status_events_quote_idx on public.client_quote_status_events(quote_id, created_at desc);

create or replace function private.prevent_commercial_snapshot_mutation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  raise exception 'commercial_snapshot_is_immutable';
end; $$;
revoke all on function private.prevent_commercial_snapshot_mutation() from public, anon, authenticated;
grant execute on function private.prevent_commercial_snapshot_mutation() to service_role;

create trigger commercial_estimates_immutable before update or delete on public.commercial_estimates
for each row execute function private.prevent_commercial_snapshot_mutation();
create trigger commercial_estimate_lines_immutable before update or delete on public.commercial_estimate_lines
for each row execute function private.prevent_commercial_snapshot_mutation();
create trigger client_commercial_quotes_immutable before update or delete on public.client_commercial_quotes
for each row execute function private.prevent_commercial_snapshot_mutation();
create trigger commercial_packages_immutable before update or delete on public.commercial_packages
for each row execute function private.prevent_commercial_snapshot_mutation();
create trigger commercial_package_files_immutable before update or delete on public.commercial_package_files
for each row execute function private.prevent_commercial_snapshot_mutation();

alter table public.commercial_pricing_profiles enable row level security;
alter table public.commercial_estimates enable row level security;
alter table public.commercial_estimate_lines enable row level security;
alter table public.client_commercial_quotes enable row level security;
alter table public.client_quote_status_events enable row level security;
alter table public.commercial_packages enable row level security;
alter table public.commercial_package_files enable row level security;

-- Cost and margin data are owner/admin/technologist internal data.
create policy commercial_pricing_profiles_select_internal on public.commercial_pricing_profiles for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin','technologist'])));
create policy commercial_estimates_select_internal on public.commercial_estimates for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin','technologist'])));
create policy commercial_estimate_lines_select_internal on public.commercial_estimate_lines for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin','technologist'])));

-- Client quote documents can be read by any active organization member; writes remain server-side.
create policy client_commercial_quotes_select_org on public.client_commercial_quotes for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy client_quote_status_events_select_org on public.client_quote_status_events for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy commercial_packages_select_org on public.commercial_packages for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy commercial_package_files_select_org on public.commercial_package_files for select to authenticated
using ((select private.is_org_member(organization_id)));

revoke all on table public.commercial_pricing_profiles, public.commercial_estimates, public.commercial_estimate_lines,
  public.client_commercial_quotes, public.client_quote_status_events, public.commercial_packages, public.commercial_package_files
  from anon, authenticated;

grant select on table public.commercial_pricing_profiles, public.commercial_estimates, public.commercial_estimate_lines,
  public.client_commercial_quotes, public.client_quote_status_events, public.commercial_packages, public.commercial_package_files
  to authenticated;

grant select, insert, update, delete on table public.commercial_pricing_profiles, public.commercial_estimates, public.commercial_estimate_lines,
  public.client_commercial_quotes, public.client_quote_status_events, public.commercial_packages, public.commercial_package_files
  to service_role;

-- Pricing profile documents are versioned. Only status/name can be updated after creation; pricing_json/fingerprint stay frozen.
create or replace function private.guard_commercial_pricing_profile_update()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.organization_id <> old.organization_id or new.currency <> old.currency or new.version <> old.version
     or new.pricing_json <> old.pricing_json or new.fingerprint_sha256 <> old.fingerprint_sha256 then
    raise exception 'commercial_pricing_profile_version_is_immutable';
  end if;
  new.updated_at := now();
  return new;
end; $$;
revoke all on function private.guard_commercial_pricing_profile_update() from public, anon, authenticated;
grant execute on function private.guard_commercial_pricing_profile_update() to service_role;
create trigger commercial_pricing_profile_guard before update on public.commercial_pricing_profiles
for each row execute function private.guard_commercial_pricing_profile_update();
