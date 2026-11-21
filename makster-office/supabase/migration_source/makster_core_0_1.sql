-- Makster Core 0.1
-- Migration body. In the real repository create the timestamped migration with:
--   supabase migration new makster_core_0_1
-- and place this SQL into the generated file.
--
-- Design goals:
--   * multi-tenant organization isolation
--   * immutable project revisions
--   * explicit Data API GRANTs + RLS
--   * optimistic concurrency through parent_revision_id
--   * canonical ProjectModel v1 snapshots in jsonb
--   * audit trail for revision creation

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Core tables
-- -----------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Europe/Prague',
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in (
    'owner', 'admin', 'sales', 'designer', 'technologist',
    'production', 'installer', 'accountant', 'viewer'
  )),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_idx
  on public.organization_members(user_id, organization_id)
  where status = 'active';

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 200),
  email text,
  phone text,
  address jsonb not null default '{}'::jsonb check (jsonb_typeof(address) = 'object'),
  notes text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint clients_id_org_unique unique (id, organization_id)
);

create index if not exists clients_organization_idx
  on public.clients(organization_id, updated_at desc);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid,
  name text not null check (char_length(name) between 1 and 200),
  project_type text not null default 'mixed' check (project_type in (
    'wardrobe', 'walk_in', 'kitchen', 'cabinet', 'sideboard', 'built_in', 'mixed'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'active', 'quoted', 'approved', 'engineering',
    'production', 'installed', 'completed', 'archived'
  )),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  current_revision_id uuid,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint projects_id_org_unique unique (id, organization_id),
  constraint projects_client_org_fk
    foreign key (client_id, organization_id)
    references public.clients(id, organization_id)
    on delete restrict
);

create index if not exists projects_organization_status_idx
  on public.projects(organization_id, status, updated_at desc);

create index if not exists projects_client_idx
  on public.projects(client_id)
  where client_id is not null;

create table if not exists public.project_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  revision_number integer not null check (revision_number >= 1),
  parent_revision_id uuid,
  schema_version text not null default '1.0.0',
  snapshot_json jsonb not null,
  change_set_json jsonb not null default '[]'::jsonb,
  snapshot_hash text not null default '',
  source text not null default 'manual' check (source in (
    'manual', 'ai', 'client', 'import', 'engineering', 'system'
  )),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint project_revisions_project_fk
    foreign key (project_id, organization_id)
    references public.projects(id, organization_id)
    on delete cascade,

  constraint project_revisions_number_unique
    unique (project_id, revision_number),

  constraint project_revisions_identity_unique
    unique (id, project_id, organization_id),

  constraint project_revisions_snapshot_object_check
    check (jsonb_typeof(snapshot_json) = 'object'),

  constraint project_revisions_change_set_check
    check (jsonb_typeof(change_set_json) in ('array', 'object')),

  constraint project_revisions_schema_version_check
    check (schema_version = '1.0.0'),

  constraint project_revisions_snapshot_schema_check
    check (snapshot_json ->> 'schemaVersion' = schema_version),

  constraint project_revisions_snapshot_project_check
    check (snapshot_json ->> 'projectId' = project_id::text),

  constraint project_revisions_snapshot_revision_check
    check ((snapshot_json ->> 'revision')::integer = revision_number)
);

alter table public.project_revisions
  drop constraint if exists project_revisions_parent_fk;

alter table public.project_revisions
  add constraint project_revisions_parent_fk
  foreign key (parent_revision_id, project_id, organization_id)
  references public.project_revisions(id, project_id, organization_id)
  on delete cascade;

alter table public.projects
  drop constraint if exists projects_current_revision_fk;

alter table public.projects
  add constraint projects_current_revision_fk
  foreign key (current_revision_id)
  references public.project_revisions(id)
  on delete set null;

create index if not exists project_revisions_project_created_idx
  on public.project_revisions(project_id, revision_number desc);

create index if not exists project_revisions_organization_idx
  on public.project_revisions(organization_id, created_at desc);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  revision_id uuid,
  file_type text not null check (file_type in (
    'photo', 'measurement', 'drawing', 'pdf', 'render',
    'contract', 'invoice', 'cnc', 'other'
  )),
  bucket_id text not null default 'makster-project-files',
  storage_path text not null check (char_length(storage_path) > 0),
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  uploaded_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint project_files_project_fk
    foreign key (project_id, organization_id)
    references public.projects(id, organization_id)
    on delete cascade,

  constraint project_files_revision_fk
    foreign key (revision_id, project_id, organization_id)
    references public.project_revisions(id, project_id, organization_id)
    on delete cascade,

  constraint project_files_storage_unique
    unique (bucket_id, storage_path)
);

create index if not exists project_files_project_idx
  on public.project_files(project_id, created_at desc);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid,
  revision_id uuid,
  actor_type text not null check (actor_type in ('user', 'agent', 'system')),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_agent text,
  action text not null check (char_length(action) between 1 and 160),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id text,
  before_json jsonb,
  after_json jsonb,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),

  constraint audit_logs_project_fk
    foreign key (project_id, organization_id)
    references public.projects(id, organization_id)
    on delete cascade,

  constraint audit_logs_revision_project_check
    check (revision_id is null or project_id is not null),

  constraint audit_logs_revision_fk
    foreign key (revision_id, project_id, organization_id)
    references public.project_revisions(id, project_id, organization_id)
    on delete cascade
);

create index if not exists audit_logs_org_created_idx
  on public.audit_logs(organization_id, created_at desc);

create index if not exists audit_logs_project_created_idx
  on public.audit_logs(project_id, created_at desc)
  where project_id is not null;

-- -----------------------------------------------------------------------------
-- Generic updated_at trigger
-- -----------------------------------------------------------------------------

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_updated_at() from public, anon, authenticated;

create trigger organizations_touch_updated_at
before update on public.organizations
for each row execute function private.touch_updated_at();

create trigger organization_members_touch_updated_at
before update on public.organization_members
for each row execute function private.touch_updated_at();

create trigger clients_touch_updated_at
before update on public.clients
for each row execute function private.touch_updated_at();

create trigger projects_touch_updated_at
before update on public.projects
for each row execute function private.touch_updated_at();

-- -----------------------------------------------------------------------------
-- RLS helper functions. These are SECURITY DEFINER to avoid RLS recursion on
-- organization_members. They live in a non-exposed schema, have an empty
-- search_path, and are callable only by authenticated/service_role.
-- -----------------------------------------------------------------------------

create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    );
$$;

create or replace function private.has_org_role(
  p_organization_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members m
      where m.organization_id = p_organization_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
        and m.role = any(p_roles)
    );
$$;

revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.has_org_role(uuid, text[]) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated, service_role;
grant execute on function private.has_org_role(uuid, text[]) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Revision lifecycle
-- -----------------------------------------------------------------------------

-- BEFORE INSERT: lock the project, enforce optimistic concurrency, assign the
-- next revision number, and canonicalize snapshot metadata.
create or replace function private.prepare_project_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_current_revision_id uuid;
  v_current_revision_number integer;
begin
  select p.current_revision_id
    into v_current_revision_id
  from public.projects p
  where p.id = new.project_id
    and p.organization_id = new.organization_id
  for update;

  if not found then
    raise exception 'project_not_found_or_not_accessible'
      using errcode = 'P0002';
  end if;

  if new.parent_revision_id is distinct from v_current_revision_id then
    raise exception 'revision_conflict: expected parent %, current revision %',
      new.parent_revision_id, v_current_revision_id
      using errcode = '40001';
  end if;

  if v_current_revision_id is null then
    v_current_revision_number := 0;
  else
    select r.revision_number
      into strict v_current_revision_number
    from public.project_revisions r
    where r.id = v_current_revision_id
      and r.project_id = new.project_id
      and r.organization_id = new.organization_id;
  end if;

  new.revision_number := v_current_revision_number + 1;
  new.schema_version := '1.0.0';

  new.snapshot_json := jsonb_set(
    coalesce(new.snapshot_json, '{}'::jsonb),
    '{schemaVersion}',
    to_jsonb(new.schema_version),
    true
  );
  new.snapshot_json := jsonb_set(
    new.snapshot_json,
    '{projectId}',
    to_jsonb(new.project_id::text),
    true
  );
  new.snapshot_json := jsonb_set(
    new.snapshot_json,
    '{revision}',
    to_jsonb(new.revision_number),
    true
  );

  -- Fingerprint for caching/deduplication only; not a security primitive.
  new.snapshot_hash := pg_catalog.md5(new.snapshot_json::text);

  return new;
end;
$$;

revoke all on function private.prepare_project_revision() from public, anon, authenticated;

create trigger project_revisions_prepare
before insert on public.project_revisions
for each row execute function private.prepare_project_revision();

-- AFTER INSERT: move the project's current revision pointer. SECURITY DEFINER is
-- intentionally kept in the private schema because authenticated users do not
-- receive UPDATE privilege on current_revision_id directly.
create or replace function private.activate_project_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects
  set current_revision_id = new.id,
      updated_at = now()
  where id = new.project_id
    and organization_id = new.organization_id;

  if not found then
    raise exception 'project_revision_activation_failed'
      using errcode = 'P0002';
  end if;

  return new;
end;
$$;

revoke all on function private.activate_project_revision() from public, anon, authenticated;

create trigger project_revisions_activate
after insert on public.project_revisions
for each row execute function private.activate_project_revision();

-- Immutable snapshots: normal application roles can never UPDATE/DELETE a
-- revision. Only the postgres owner can do maintenance during a controlled
-- migration.
create or replace function private.prevent_project_revision_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'postgres' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  raise exception 'project_revisions_are_immutable'
    using errcode = '55000';
end;
$$;

revoke all on function private.prevent_project_revision_mutation() from public, anon, authenticated;

create trigger project_revisions_immutable
before update or delete on public.project_revisions
for each row execute function private.prevent_project_revision_mutation();

-- Audit revision creation. Trigger is private and SECURITY DEFINER so clients do
-- not get INSERT privileges on the audit table.
create or replace function private.audit_project_revision_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (
    organization_id,
    project_id,
    revision_id,
    actor_type,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_json,
    metadata
  ) values (
    new.organization_id,
    new.project_id,
    new.id,
    case when new.created_by is null then 'system' else 'user' end,
    new.created_by,
    'project.revision.created',
    'project_revision',
    new.id::text,
    jsonb_build_object(
      'revisionNumber', new.revision_number,
      'schemaVersion', new.schema_version,
      'snapshotHash', new.snapshot_hash,
      'source', new.source
    ),
    jsonb_build_object('parentRevisionId', new.parent_revision_id)
  );

  return new;
end;
$$;

revoke all on function private.audit_project_revision_created() from public, anon, authenticated;

create trigger project_revisions_audit
after insert on public.project_revisions
for each row execute function private.audit_project_revision_created();

-- -----------------------------------------------------------------------------
-- Atomic project bootstrap RPC. SECURITY INVOKER means normal table grants and
-- RLS still apply; the function only makes project + revision creation atomic.
-- -----------------------------------------------------------------------------

create or replace function public.create_project_with_initial_revision(
  p_project_id uuid,
  p_organization_id uuid,
  p_name text,
  p_project_type text,
  p_currency text,
  p_snapshot jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revision_id uuid;
begin
  insert into public.projects (
    id, organization_id, name, project_type, currency
  ) values (
    p_project_id, p_organization_id, p_name, p_project_type, p_currency
  );

  insert into public.project_revisions (
    organization_id, project_id, parent_revision_id, snapshot_json, change_set_json, source
  ) values (
    p_organization_id, p_project_id, null, p_snapshot, '[]'::jsonb, 'manual'
  ) returning id into v_revision_id;

  return v_revision_id;
end;
$$;

revoke all on function public.create_project_with_initial_revision(uuid, uuid, text, text, text, jsonb)
  from public, anon;
grant execute on function public.create_project_with_initial_revision(uuid, uuid, text, text, text, jsonb)
  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_revisions enable row level security;
alter table public.project_files enable row level security;
alter table public.audit_logs enable row level security;

-- Organizations
create policy organizations_select_member
on public.organizations
for select
to authenticated
using ((select private.is_org_member(id)));

create policy organizations_update_admin
on public.organizations
for update
to authenticated
using ((select private.has_org_role(id, array['owner','admin']::text[])))
with check ((select private.has_org_role(id, array['owner','admin']::text[])));

-- Organization members
create policy organization_members_select_member
on public.organization_members
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy organization_members_insert_admin
on public.organization_members
for insert
to authenticated
with check ((select private.has_org_role(organization_id, array['owner','admin']::text[])));

create policy organization_members_update_admin
on public.organization_members
for update
to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin']::text[])))
with check ((select private.has_org_role(organization_id, array['owner','admin']::text[])));

create policy organization_members_delete_admin
on public.organization_members
for delete
to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin']::text[])));

-- Clients
create policy clients_select_member
on public.clients
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy clients_insert_sales
on public.clients
for insert
to authenticated
with check (
  (select private.has_org_role(organization_id, array['owner','admin','sales']::text[]))
  and created_by = (select auth.uid())
);

create policy clients_update_sales
on public.clients
for update
to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','sales']::text[])))
with check ((select private.has_org_role(organization_id, array['owner','admin','sales']::text[])));

-- Projects
create policy projects_select_member
on public.projects
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy projects_insert_editor
on public.projects
for insert
to authenticated
with check (
  (select private.has_org_role(organization_id, array['owner','admin','sales','designer','technologist']::text[]))
  and created_by = (select auth.uid())
);

create policy projects_update_editor
on public.projects
for update
to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','sales','designer','technologist']::text[])))
with check ((select private.has_org_role(organization_id, array['owner','admin','sales','designer','technologist']::text[])));

-- Project revisions. Direct INSERT is allowed only to editing roles; the trigger
-- atomically enforces the parent/current revision relationship and activates the
-- new revision. No UPDATE/DELETE policy exists.
create policy project_revisions_select_member
on public.project_revisions
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy project_revisions_insert_editor
on public.project_revisions
for insert
to authenticated
with check (
  (select private.has_org_role(organization_id, array['owner','admin','sales','designer','technologist']::text[]))
  and created_by = (select auth.uid())
);

-- Project files metadata
create policy project_files_select_member
on public.project_files
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy project_files_insert_contributor
on public.project_files
for insert
to authenticated
with check (
  (select private.has_org_role(
    organization_id,
    array['owner','admin','sales','designer','technologist','production','installer']::text[]
  ))
  and uploaded_by = (select auth.uid())
);

create policy project_files_update_contributor
on public.project_files
for update
to authenticated
using ((select private.has_org_role(
  organization_id,
  array['owner','admin','sales','designer','technologist','production','installer']::text[]
)))
with check ((select private.has_org_role(
  organization_id,
  array['owner','admin','sales','designer','technologist','production','installer']::text[]
)));

-- Audit log is read-only from client code.
create policy audit_logs_select_member
on public.audit_logs
for select
to authenticated
using ((select private.is_org_member(organization_id)));

-- -----------------------------------------------------------------------------
-- Explicit grants for the Supabase Data API.
-- Supabase changed new-project defaults in 2026, so these grants intentionally
-- live in the migration alongside RLS.
-- -----------------------------------------------------------------------------

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.organization_members from anon, authenticated;
revoke all on table public.clients from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.project_revisions from anon, authenticated;
revoke all on table public.project_files from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;

-- Read access
grant select on table public.organizations to authenticated;
grant select on table public.organization_members to authenticated;
grant select on table public.clients to authenticated;
grant select on table public.projects to authenticated;
grant select on table public.project_revisions to authenticated;
grant select on table public.project_files to authenticated;
grant select on table public.audit_logs to authenticated;

-- Controlled writes. Column grants deliberately prevent clients from directly
-- changing projects.current_revision_id or revision_number/snapshot_hash.
grant update (name, country_code, currency, timezone, settings)
  on public.organizations to authenticated;

grant insert (organization_id, user_id, role, status)
  on table public.organization_members to authenticated;
grant update (role, status)
  on table public.organization_members to authenticated;
grant delete
  on table public.organization_members to authenticated;

grant insert (
    id, organization_id, display_name, email, phone, address, notes, archived_at
  ) on table public.clients to authenticated;
grant update (display_name, email, phone, address, notes, archived_at)
  on table public.clients to authenticated;

grant insert (
    id, organization_id, client_id, name, project_type, status, currency, settings, archived_at
  ) on table public.projects to authenticated;
grant update (client_id, name, project_type, status, currency, settings, archived_at)
  on table public.projects to authenticated;

grant insert (
    id, organization_id, project_id, parent_revision_id, schema_version,
    snapshot_json, change_set_json, source
  ) on table public.project_revisions to authenticated;

grant insert (
    id, organization_id, project_id, revision_id, file_type, bucket_id,
    storage_path, mime_type, size_bytes, metadata
  ) on table public.project_files to authenticated;
grant update (revision_id, file_type, bucket_id, storage_path, mime_type, size_bytes, metadata)
  on table public.project_files to authenticated;

-- Server-side code receives only the privileges it needs. RLS is bypassed by
-- the server-side secret/service role; never expose it to the browser. Hard
-- deletion of organizations/projects/revisions is intentionally maintenance-only.
grant select, insert, update on table public.organizations to service_role;
grant select, insert, update, delete on table public.organization_members to service_role;
grant select, insert, update on table public.clients to service_role;
grant select, insert, update on table public.projects to service_role;
grant select, insert on table public.project_revisions to service_role;
grant select, insert, update, delete on table public.project_files to service_role;
grant select, insert on table public.audit_logs to service_role;
grant usage, select on sequence public.audit_logs_id_seq to service_role;

-- Authenticated users do not need direct sequence access because audit rows are
-- inserted only through private triggers.
revoke all on sequence public.audit_logs_id_seq from anon, authenticated;

-- Bootstrap note:
-- Organization creation + first owner membership are intentionally server-only.
-- Makster's Edge/API layer must create both rows in one trusted transaction.
-- This avoids an unsafe "any authenticated user can self-assign owner" RLS path.

commit;
