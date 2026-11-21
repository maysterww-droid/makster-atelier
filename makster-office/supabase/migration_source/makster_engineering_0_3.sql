-- Makster Engineering 0.3
-- Derived engineering artifacts are immutable and are always tied to one exact
-- Project Revision + Engineering Engine version + ruleset + input checksum.
--
-- Create the real timestamped migration with:
--   supabase migration new makster_engineering_0_3
-- then copy this body into the generated file.

begin;

create table if not exists public.engineering_artifacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  revision_id uuid not null,
  engine_version text not null check (char_length(engine_version) between 1 and 40),
  ruleset_id text not null check (char_length(ruleset_id) between 1 and 120),
  input_checksum text not null check (char_length(input_checksum) between 32 and 128),
  artifact_version text not null default '1.0.0',
  result_json jsonb not null check (jsonb_typeof(result_json) = 'object'),
  ready_for_production boolean not null default false,
  blocking_count integer not null default 0 check (blocking_count >= 0),
  warning_count integer not null default 0 check (warning_count >= 0),
  generated_by text not null default 'makster-engineering',
  created_at timestamptz not null default now(),

  constraint engineering_artifacts_revision_fk
    foreign key (revision_id, project_id, organization_id)
    references public.project_revisions(id, project_id, organization_id)
    on delete cascade,

  constraint engineering_artifacts_unique_build
    unique (revision_id, engine_version, ruleset_id, input_checksum),

  constraint engineering_artifacts_project_json_check
    check (result_json ->> 'projectId' = project_id::text),

  constraint engineering_artifacts_engine_json_check
    check (result_json ->> 'engineVersion' = engine_version),

  constraint engineering_artifacts_ruleset_json_check
    check (result_json ->> 'ruleSetId' = ruleset_id),

  constraint engineering_artifacts_checksum_json_check
    check (result_json ->> 'inputChecksum' = input_checksum)
);

create index if not exists engineering_artifacts_project_revision_idx
  on public.engineering_artifacts(project_id, revision_id, created_at desc);

create index if not exists engineering_artifacts_org_created_idx
  on public.engineering_artifacts(organization_id, created_at desc);

-- Immutable derived artifacts. A new engine/ruleset/input generates a new row.
create or replace function private.prevent_engineering_artifact_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'postgres' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  raise exception 'engineering_artifacts_are_immutable'
    using errcode = '55000';
end;
$$;

revoke all on function private.prevent_engineering_artifact_mutation()
  from public, anon, authenticated;

create trigger engineering_artifacts_immutable
before update or delete on public.engineering_artifacts
for each row execute function private.prevent_engineering_artifact_mutation();

-- Audit a successful trusted compile.
create or replace function private.audit_engineering_artifact_created()
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
    actor_agent,
    action,
    entity_type,
    entity_id,
    after_json,
    metadata
  ) values (
    new.organization_id,
    new.project_id,
    new.revision_id,
    'agent',
    new.generated_by,
    'engineering.compiled',
    'engineering_artifact',
    new.id::text,
    jsonb_build_object(
      'engineVersion', new.engine_version,
      'rulesetId', new.ruleset_id,
      'inputChecksum', new.input_checksum,
      'readyForProduction', new.ready_for_production,
      'blockingCount', new.blocking_count,
      'warningCount', new.warning_count
    ),
    '{}'::jsonb
  );
  return new;
end;
$$;

revoke all on function private.audit_engineering_artifact_created()
  from public, anon, authenticated;

create trigger engineering_artifacts_audit
after insert on public.engineering_artifacts
for each row execute function private.audit_engineering_artifact_created();

alter table public.engineering_artifacts enable row level security;

-- Members may inspect engineering results. Creation is intentionally server-only:
-- users/AI in the browser cannot claim that arbitrary JSON is production-safe.
create policy engineering_artifacts_select_member
on public.engineering_artifacts
for select
to authenticated
using ((select private.is_org_member(organization_id)));

revoke all on table public.engineering_artifacts from anon, authenticated;
grant select on table public.engineering_artifacts to authenticated;

grant select, insert on table public.engineering_artifacts to service_role;

commit;
