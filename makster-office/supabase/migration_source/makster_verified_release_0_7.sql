-- Makster Core 0.7 / Verified Manufacturing Artifact Pipeline
-- Migration body only. In the real repository first run:
--   supabase migration new makster_verified_release_0_7
-- and copy this SQL into the generated timestamped migration.
--
-- Goals:
--   * BXF uploads live in a PRIVATE Storage bucket
--   * release packages are immutable and tied to one exact Engineering Artifact
--   * production signatures use Ed25519 public-key registry; private keys never enter Postgres
--   * browser users may inspect releases but cannot manufacture a release row/signature themselves
--   * fixture_only/estimated data is never represented as an authorized release

begin;

-- -----------------------------------------------------------------------------
-- Private manufacturing files
-- Path convention:
--   <organization-uuid>/<project-uuid>/bxf/<import-uuid>/<filename>
--   <organization-uuid>/<project-uuid>/release/<release-uuid>/<filename>
-- Authenticated clients may upload only into /bxf/. Release files are server-only.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('makster-manufacturing-private', 'makster-manufacturing-private', false)
on conflict (id) do nothing;

create or replace function private.storage_path_org_id(p_name text)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v text;
begin
  v := (storage.foldername(p_name))[1];
  if v is null or v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return v::uuid;
exception when others then
  return null;
end;
$$;

revoke all on function private.storage_path_org_id(text) from public, anon;
grant execute on function private.storage_path_org_id(text) to authenticated, service_role;

create policy "makster manufacturing files readable by org members"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'makster-manufacturing-private'
  and (select private.is_org_member(private.storage_path_org_id(name)))
);

create policy "contributors can upload immutable bxf sources"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'makster-manufacturing-private'
  and (storage.foldername(name))[3] = 'bxf'
  and (select private.has_org_role(
    private.storage_path_org_id(name),
    array['owner','admin','designer','technologist','production']::text[]
  ))
);

-- No authenticated UPDATE/DELETE policy is intentionally created. BXF source bytes
-- are immutable evidence. Cleanup/release-file creation is service-role only.

-- A recognized import must ultimately refer to stored source bytes. NOT VALID keeps
-- this migration compatible with any local 0.6 fixture rows; validate after cleanup.
alter table public.bxf_imports
  add constraint bxf_recognized_requires_storage_chk
  check (import_status <> 'recognized' or storage_path is not null) not valid;

-- -----------------------------------------------------------------------------
-- Public keys only. Private signing keys stay in KMS/secret storage, never Postgres.
-- -----------------------------------------------------------------------------

create table if not exists public.manufacturing_signing_keys (
  key_id text primary key check (char_length(key_id) between 3 and 120),
  organization_id uuid references public.organizations(id) on delete cascade,
  algorithm text not null default 'Ed25519' check (algorithm = 'Ed25519'),
  public_key_pem text not null check (char_length(public_key_pem) between 64 and 4096),
  public_key_sha256 text not null check (char_length(public_key_sha256) = 64),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint manufacturing_signing_key_active_chk
    check ((is_active and revoked_at is null) or (not is_active))
);

create index if not exists manufacturing_signing_keys_org_idx
  on public.manufacturing_signing_keys(organization_id, is_active);

alter table public.manufacturing_signing_keys enable row level security;
create policy manufacturing_signing_keys_select
on public.manufacturing_signing_keys
for select
to authenticated
using (organization_id is null or (select private.is_org_member(organization_id)));

revoke all on table public.manufacturing_signing_keys from anon, authenticated;
grant select on table public.manufacturing_signing_keys to authenticated;
grant select, insert, update on table public.manufacturing_signing_keys to service_role;

-- -----------------------------------------------------------------------------
-- Optional manual verification evidence. It is immutable and server-published after
-- an explicit approval workflow. 0.7 records the concept; Approval Center can create
-- these in a later version.
-- -----------------------------------------------------------------------------

create table if not exists public.manufacturing_verification_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  manufacturer text not null,
  hardware_code text not null,
  profile_kind text not null check (profile_kind in ('runner_cabinet_drilling','hinge_drilling','lift_drilling','other')),
  source_storage_path text not null,
  source_sha256 text not null check (char_length(source_sha256) = 64),
  verified_by uuid not null references auth.users(id) on delete restrict,
  verified_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  constraint manufacturing_verification_unique
    unique (organization_id, manufacturer, hardware_code, profile_kind, source_sha256)
);

alter table public.manufacturing_verification_records enable row level security;
create policy manufacturing_verification_records_select
on public.manufacturing_verification_records
for select
to authenticated
using ((select private.is_org_member(organization_id)));

revoke all on table public.manufacturing_verification_records from anon, authenticated;
grant select on table public.manufacturing_verification_records to authenticated;
grant select, insert on table public.manufacturing_verification_records to service_role;

alter table public.hardware_manufacturing_profiles
  add column if not exists manual_verification_id uuid
    references public.manufacturing_verification_records(id) on delete restrict;

alter table public.hardware_manufacturing_profiles
  add constraint hardware_manufacturing_manual_provenance_chk
  check (
    source_kind <> 'manual_verified'
    or (manual_verification_id is not null and is_verified = true)
  ) not valid;

-- Exact composite identity for release linkage.
alter table public.engineering_artifacts
  add constraint engineering_artifacts_release_identity_unique
  unique (id, organization_id, project_id, revision_id);

-- -----------------------------------------------------------------------------
-- Immutable CNC release packages
-- -----------------------------------------------------------------------------

create table if not exists public.manufacturing_release_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  revision_id uuid not null,
  engineering_artifact_id uuid not null,
  release_policy_version text not null check (char_length(release_policy_version) between 1 and 80),
  manifest_version text not null default '1.0.0' check (manifest_version = '1.0.0'),
  status text not null check (status in ('blocked','ready_to_sign','signed')),
  ready_for_production boolean not null,
  engineering_cnc_ready boolean not null,
  release_trust_ready boolean not null,
  can_release_to_cnc boolean not null default false,
  manifest_json jsonb not null check (jsonb_typeof(manifest_json) = 'object'),
  manifest_sha256 text not null check (char_length(manifest_sha256) = 64),
  signing_key_id text references public.manufacturing_signing_keys(key_id) on delete restrict,
  signature_base64 text,
  created_by text not null default 'makster-release-worker',
  created_at timestamptz not null default now(),

  constraint manufacturing_release_engineering_fk
    foreign key (engineering_artifact_id, organization_id, project_id, revision_id)
    references public.engineering_artifacts(id, organization_id, project_id, revision_id)
    on delete restrict,

  constraint manufacturing_release_project_revision_fk
    foreign key (revision_id, project_id, organization_id)
    references public.project_revisions(id, project_id, organization_id)
    on delete restrict,

  constraint manufacturing_release_signed_chk check (
    status <> 'signed'
    or (
      ready_for_production
      and engineering_cnc_ready
      and release_trust_ready
      and can_release_to_cnc
      and signing_key_id is not null
      and signature_base64 is not null
    )
  ),

  constraint manufacturing_release_unsigned_chk check (
    status = 'signed' or can_release_to_cnc = false
  ),

  constraint manufacturing_release_manifest_project_chk
    check (manifest_json ->> 'projectId' = project_id::text),
  constraint manufacturing_release_manifest_id_chk
    check (manifest_json ->> 'releaseId' = id::text),
  constraint manufacturing_release_ready_to_sign_chk check (
    status <> 'ready_to_sign'
    or (ready_for_production and engineering_cnc_ready and release_trust_ready and can_release_to_cnc = false)
  ),
  constraint manufacturing_release_id_org_unique unique (id, organization_id)
);

-- Revision/status/canRelease cross-checks are enforced by the BEFORE INSERT trigger below.

create index if not exists manufacturing_release_packages_project_idx
  on public.manufacturing_release_packages(project_id, created_at desc);
create index if not exists manufacturing_release_packages_engineering_idx
  on public.manufacturing_release_packages(engineering_artifact_id);

create table if not exists public.manufacturing_release_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  release_package_id uuid not null,
  file_name text not null check (char_length(file_name) between 1 and 240),
  media_type text not null,
  byte_length bigint not null check (byte_length >= 0),
  sha256 text not null check (char_length(sha256) = 64),
  storage_path text not null,
  created_at timestamptz not null default now(),
  constraint manufacturing_release_file_package_fk
    foreign key (release_package_id, organization_id)
    references public.manufacturing_release_packages(id, organization_id) on delete restrict,
  constraint manufacturing_release_file_path_org_chk
    check (storage_path like organization_id::text || '/%'),
  constraint manufacturing_release_file_unique unique (release_package_id, file_name),
  constraint manufacturing_release_file_storage_unique unique (storage_path)
);

create index if not exists manufacturing_release_files_org_idx
  on public.manufacturing_release_files(organization_id, release_package_id);

create or replace function private.prevent_manufacturing_release_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'postgres' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  raise exception 'manufacturing_release_artifacts_are_immutable' using errcode = '55000';
end;
$$;

revoke all on function private.prevent_manufacturing_release_mutation() from public, anon, authenticated;

create trigger manufacturing_release_packages_immutable
before update or delete on public.manufacturing_release_packages
for each row execute function private.prevent_manufacturing_release_mutation();

create trigger manufacturing_release_files_immutable
before update or delete on public.manufacturing_release_files
for each row execute function private.prevent_manufacturing_release_mutation();

create or replace function private.validate_manufacturing_release_manifest()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_revision integer;
begin
  select r.revision_number into v_revision
  from public.project_revisions r
  where r.id = new.revision_id
    and r.project_id = new.project_id
    and r.organization_id = new.organization_id;

  if v_revision is null then raise exception 'release_revision_not_found' using errcode = '23503'; end if;
  if (new.manifest_json ->> 'revision')::integer <> v_revision then
    raise exception 'release_manifest_revision_mismatch' using errcode = '23514';
  end if;
  if (new.manifest_json ->> 'status') <> new.status then
    raise exception 'release_manifest_status_mismatch' using errcode = '23514';
  end if;
  if coalesce((new.manifest_json ->> 'canReleaseToCnc')::boolean, false) <> new.can_release_to_cnc then
    raise exception 'release_manifest_cnc_flag_mismatch' using errcode = '23514';
  end if;
  if (new.manifest_json ->> 'releasePolicyVersion') <> new.release_policy_version then
    raise exception 'release_manifest_policy_version_mismatch' using errcode = '23514';
  end if;
  if new.status = 'signed' and (
    new.manifest_json #>> '{signature,keyId}' is distinct from new.signing_key_id
    or new.manifest_json #>> '{signature,signatureBase64}' is distinct from new.signature_base64
  ) then
    raise exception 'release_manifest_signature_columns_mismatch' using errcode = '23514';
  end if;
  if new.signing_key_id is not null and not exists (
    select 1 from public.manufacturing_signing_keys k
    where k.key_id = new.signing_key_id
      and k.is_active = true
      and k.revoked_at is null
      and (k.organization_id is null or k.organization_id = new.organization_id)
  ) then
    raise exception 'release_signing_key_not_active_for_organization' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_manufacturing_release_manifest() from public, anon, authenticated;

create trigger manufacturing_release_manifest_validate
before insert on public.manufacturing_release_packages
for each row execute function private.validate_manufacturing_release_manifest();

create or replace function private.audit_manufacturing_release_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (
    organization_id, project_id, revision_id, actor_type, actor_agent,
    action, entity_type, entity_id, after_json, metadata
  ) values (
    new.organization_id, new.project_id, new.revision_id, 'agent', new.created_by,
    case when new.status = 'signed' then 'manufacturing.release.signed' else 'manufacturing.release.created' end,
    'manufacturing_release_package', new.id::text,
    jsonb_build_object(
      'status', new.status,
      'manifestSha256', new.manifest_sha256,
      'releaseTrustReady', new.release_trust_ready,
      'canReleaseToCnc', new.can_release_to_cnc,
      'signingKeyId', new.signing_key_id
    ), '{}'::jsonb
  );
  return new;
end;
$$;

revoke all on function private.audit_manufacturing_release_created() from public, anon, authenticated;
create trigger manufacturing_release_audit
after insert on public.manufacturing_release_packages
for each row execute function private.audit_manufacturing_release_created();

alter table public.manufacturing_release_packages enable row level security;
alter table public.manufacturing_release_files enable row level security;

create policy manufacturing_release_packages_select
on public.manufacturing_release_packages
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy manufacturing_release_files_select
on public.manufacturing_release_files
for select
to authenticated
using ((select private.is_org_member(organization_id)));

revoke all on table public.manufacturing_release_packages from anon, authenticated;
revoke all on table public.manufacturing_release_files from anon, authenticated;
grant select on table public.manufacturing_release_packages to authenticated;
grant select on table public.manufacturing_release_files to authenticated;
grant select, insert on table public.manufacturing_release_packages to service_role;
grant select, insert on table public.manufacturing_release_files to service_role;

commit;
