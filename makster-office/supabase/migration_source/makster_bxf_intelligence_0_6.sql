-- Makster Engineering 0.6 / BXF Intelligence
-- Migration body only. Create a real timestamped migration with:
--   supabase migration new makster_bxf_intelligence_0_6
--
-- IMPORTANT: Blum BXF is proprietary. A raw upload is never trusted solely because it is XML.
-- Verification requires a recognized adapter built from Blum's software-partner interface specification
-- or an independently validated manufacturer export.

begin;

create table if not exists public.bxf_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  uploaded_by uuid not null references auth.users(id),
  file_name text not null check (char_length(file_name) between 1 and 240),
  storage_path text,
  byte_length bigint not null check (byte_length >= 0 and byte_length <= 5242880),
  sha256 text not null check (char_length(sha256) = 64),
  root_element text,
  schema_fingerprint text,
  import_status text not null check (import_status in ('recognized','inspection_only','rejected')),
  adapter_id text,
  report_json jsonb not null check (jsonb_typeof(report_json) = 'object'),
  created_at timestamptz not null default now(),
  constraint bxf_import_org_checksum_unique unique (organization_id, sha256)
);

create index if not exists bxf_imports_org_created_idx
  on public.bxf_imports(organization_id, created_at desc);
create index if not exists bxf_imports_project_idx
  on public.bxf_imports(project_id, created_at desc) where project_id is not null;

alter table public.bxf_imports enable row level security;
revoke all on table public.bxf_imports from anon;
grant select, insert on table public.bxf_imports to authenticated;
grant select, insert, update, delete on table public.bxf_imports to service_role;

create policy "org members can read bxf imports"
  on public.bxf_imports for select to authenticated
  using (private.is_org_member(organization_id));

create policy "org editors can register bxf imports"
  on public.bxf_imports for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and private.has_org_role(organization_id, array['owner','admin','designer','technologist','production']::text[])
  );

-- Link normalized manufacturing profiles to the exact BXF import/checksum that produced them.
alter table public.hardware_manufacturing_profiles
  add column if not exists bxf_import_id uuid references public.bxf_imports(id) on delete restrict,
  add column if not exists schema_fingerprint text,
  add column if not exists adapter_id text;

create index if not exists hardware_manufacturing_profiles_bxf_idx
  on public.hardware_manufacturing_profiles(bxf_import_id)
  where bxf_import_id is not null;

-- Manufacturer BXF profiles must have immutable provenance.
alter table public.hardware_manufacturing_profiles
  add constraint hardware_manufacturing_bxf_provenance_chk
  check (
    source_kind <> 'manufacturer_bxf'
    or (bxf_import_id is not null and schema_fingerprint is not null and adapter_id is not null and is_verified = true)
  ) not valid;

commit;
