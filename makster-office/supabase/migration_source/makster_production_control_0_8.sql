-- Makster Core 0.8 / Approval Center + Production Queue + Machine Postprocessors
-- Migration body only. In a real repo first run:
--   supabase migration new makster_production_control_0_8
-- then place this SQL in the generated migration file.
--
-- Source-of-truth rule:
--   public.production_queue_jobs = durable business state
--   pgmq queue "makster-production" = worker dispatch only
-- A queue message never authorizes CNC by itself.

begin;

-- -----------------------------------------------------------------------------
-- Human approval is bound to one exact release fingerprint/revision.
-- -----------------------------------------------------------------------------
create table if not exists public.production_approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null,
  revision_id uuid not null,
  release_id uuid not null,
  approval_fingerprint text not null check (approval_fingerprint ~ '^[0-9a-f]{64}$'),
  status text not null default 'requested' check (status in ('requested','approved','rejected','cancelled')),
  reason text,
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint production_approval_revision_fk
    foreign key (revision_id, project_id, organization_id)
    references public.project_revisions(id, project_id, organization_id) on delete restrict,
  constraint production_approval_identity_unique unique (release_id, approval_fingerprint),
  constraint production_approval_id_org_unique unique (id, organization_id),
  constraint production_approval_decision_time_chk check (
    (status = 'requested' and decided_at is null)
    or (status <> 'requested' and decided_at is not null)
  )
);

create table if not exists public.production_approval_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  approval_request_id uuid not null,
  decision text not null check (decision in ('approved','rejected')),
  actor_id uuid references auth.users(id) on delete restrict,
  actor_role text not null check (actor_role in ('owner','admin','technologist')),
  note text,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint production_approval_decision_request_fk
    foreign key (approval_request_id, organization_id)
    references public.production_approval_requests(id, organization_id) on delete restrict,
  constraint production_approval_single_decision unique (approval_request_id)
);


create index if not exists production_approval_project_idx
  on public.production_approval_requests(project_id, requested_at desc);
create index if not exists production_approval_status_idx
  on public.production_approval_requests(organization_id, status, requested_at desc);

create or replace function private.guard_production_approval_request_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'requested' then raise exception 'approval_request_is_final' using errcode = '55000'; end if;
  if new.id <> old.id or new.organization_id <> old.organization_id or new.project_id <> old.project_id
     or new.revision_id <> old.revision_id or new.release_id <> old.release_id
     or new.approval_fingerprint <> old.approval_fingerprint or new.requested_by is distinct from old.requested_by
     or new.requested_at <> old.requested_at then
    raise exception 'approval_request_identity_is_immutable' using errcode = '55000';
  end if;
  if new.status not in ('approved','rejected','cancelled') or new.decided_at is null then
    raise exception 'invalid_approval_request_transition' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_production_approval_request_update() from public, anon, authenticated;

drop trigger if exists production_approval_request_update_guard on public.production_approval_requests;
create trigger production_approval_request_update_guard
before update on public.production_approval_requests
for each row execute function private.guard_production_approval_request_update();

create or replace function private.validate_production_approval_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.production_approval_requests%rowtype;
  v_role text;
begin
  select * into v_request from public.production_approval_requests r
    where r.id = new.approval_request_id and r.organization_id = new.organization_id for update;
  if v_request.id is null or v_request.status <> 'requested' then
    raise exception 'approval_request_not_pending' using errcode = '23514';
  end if;
  select m.role into v_role from public.organization_members m
    where m.organization_id = new.organization_id and m.user_id = new.actor_id and m.status = 'active';
  if v_role is null or v_role <> new.actor_role or v_role not in ('owner','admin','technologist') then
    raise exception 'approval_actor_role_not_authorized' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_production_approval_decision() from public, anon, authenticated;

drop trigger if exists production_approval_decision_validate on public.production_approval_decisions;
create trigger production_approval_decision_validate
before insert on public.production_approval_decisions
for each row execute function private.validate_production_approval_decision();

create or replace function private.apply_production_approval_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.production_approval_requests
  set status = new.decision, decided_at = new.decided_at
  where id = new.approval_request_id and organization_id = new.organization_id and status = 'requested';
  if not found then raise exception 'approval_request_transition_failed' using errcode = '23514'; end if;
  insert into public.audit_logs(organization_id, project_id, revision_id, actor_type, actor_user_id, action, entity_type, entity_id, after_json, metadata)
  select r.organization_id, r.project_id, r.revision_id, 'user', new.actor_id,
    case when new.decision = 'approved' then 'manufacturing.approval.approved' else 'manufacturing.approval.rejected' end,
    'production_approval_request', r.id::text,
    jsonb_build_object('decision', new.decision, 'actorRole', new.actor_role, 'approvalFingerprint', r.approval_fingerprint), '{}'::jsonb
  from public.production_approval_requests r where r.id = new.approval_request_id;
  return new;
end;
$$;
revoke all on function private.apply_production_approval_decision() from public, anon, authenticated;

drop trigger if exists production_approval_decision_apply on public.production_approval_decisions;
create trigger production_approval_decision_apply
after insert on public.production_approval_decisions
for each row execute function private.apply_production_approval_decision();

-- Approval decisions are append-only. Request mutation is service-side and only
-- changes requested -> approved/rejected/cancelled once.
create or replace function private.prevent_approval_decision_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'production_approval_decisions_are_immutable' using errcode = '55000';
end;
$$;
revoke all on function private.prevent_approval_decision_mutation() from public, anon, authenticated;

drop trigger if exists production_approval_decisions_immutable on public.production_approval_decisions;
create trigger production_approval_decisions_immutable
before update or delete on public.production_approval_decisions
for each row execute function private.prevent_approval_decision_mutation();

-- -----------------------------------------------------------------------------
-- Release table 0.8: signature requires an exact approved fingerprint.
-- -----------------------------------------------------------------------------
alter table public.manufacturing_release_packages
  add column if not exists approval_ready boolean not null default false,
  add column if not exists approval_fingerprint text,
  add column if not exists approval_request_id uuid;

alter table public.manufacturing_release_packages
  drop constraint if exists manufacturing_release_signed_chk,
  drop constraint if exists manufacturing_release_ready_to_sign_chk;

alter table public.manufacturing_release_packages
  add constraint manufacturing_release_approval_fingerprint_chk
    check (approval_fingerprint is null or approval_fingerprint ~ '^[0-9a-f]{64}$'),
  add constraint manufacturing_release_approval_fk
    foreign key (approval_request_id, organization_id)
    references public.production_approval_requests(id, organization_id) on delete restrict,
  add constraint manufacturing_release_signed_v08_chk check (
    status <> 'signed'
    or (
      ready_for_production
      and engineering_cnc_ready
      and release_trust_ready
      and approval_ready
      and can_release_to_cnc
      and approval_request_id is not null
      and approval_fingerprint is not null
      and signing_key_id is not null
      and signature_base64 is not null
    )
  ),
  add constraint manufacturing_release_ready_to_sign_v08_chk check (
    status <> 'ready_to_sign'
    or (ready_for_production and engineering_cnc_ready and release_trust_ready and approval_ready and can_release_to_cnc = false)
  );

-- Extend old status constraint if it exists.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.manufacturing_release_packages'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%blocked%ready_to_sign%signed%'
  loop
    execute format('alter table public.manufacturing_release_packages drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.manufacturing_release_packages
  add constraint manufacturing_release_status_v08_chk
  check (status in ('blocked','awaiting_approval','ready_to_sign','signed'));

create or replace function private.validate_manufacturing_release_manifest()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_revision integer;
  v_approval public.production_approval_requests%rowtype;
begin
  select r.revision_number into v_revision
  from public.project_revisions r
  where r.id = new.revision_id
    and r.project_id = new.project_id
    and r.organization_id = new.organization_id;

  if v_revision is null then raise exception 'release_revision_not_found' using errcode = '23503'; end if;
  if (new.manifest_json ->> 'revision')::integer <> v_revision then raise exception 'release_manifest_revision_mismatch' using errcode = '23514'; end if;
  if (new.manifest_json ->> 'status') <> new.status then raise exception 'release_manifest_status_mismatch' using errcode = '23514'; end if;
  if coalesce((new.manifest_json ->> 'canReleaseToCnc')::boolean, false) <> new.can_release_to_cnc then raise exception 'release_manifest_cnc_flag_mismatch' using errcode = '23514'; end if;
  if coalesce((new.manifest_json ->> 'approvalReady')::boolean, false) <> new.approval_ready then raise exception 'release_manifest_approval_flag_mismatch' using errcode = '23514'; end if;
  if (new.manifest_json ->> 'releasePolicyVersion') <> new.release_policy_version then raise exception 'release_manifest_policy_version_mismatch' using errcode = '23514'; end if;
  if new.manifest_json ->> 'approvalFingerprint' is distinct from new.approval_fingerprint then raise exception 'release_manifest_approval_fingerprint_mismatch' using errcode = '23514'; end if;

  if new.approval_request_id is not null then
    select * into v_approval from public.production_approval_requests a
    where a.id = new.approval_request_id and a.organization_id = new.organization_id;
    if v_approval.id is null or v_approval.status <> 'approved' then raise exception 'release_approval_not_approved' using errcode = '23514'; end if;
    if v_approval.project_id <> new.project_id or v_approval.revision_id <> new.revision_id or v_approval.release_id <> new.id then raise exception 'release_approval_identity_mismatch' using errcode = '23514'; end if;
    if v_approval.approval_fingerprint <> new.approval_fingerprint then raise exception 'release_approval_fingerprint_mismatch' using errcode = '23514'; end if;
  end if;

  if new.signing_key_id is not null and not exists (
    select 1 from public.manufacturing_signing_keys k
    where k.key_id = new.signing_key_id
      and k.is_active = true
      and k.revoked_at is null
      and (k.organization_id is null or k.organization_id = new.organization_id)
  ) then raise exception 'release_signing_key_not_active_for_organization' using errcode = '23514'; end if;

  if new.status = 'signed' and (
    new.manifest_json #>> '{signature,keyId}' is distinct from new.signing_key_id
    or new.manifest_json #>> '{signature,signatureBase64}' is distinct from new.signature_base64
    or new.manifest_json #>> '{approval,approvalId}' is distinct from new.approval_request_id::text
  ) then raise exception 'release_manifest_authorization_columns_mismatch' using errcode = '23514'; end if;

  return new;
end;
$$;
revoke all on function private.validate_manufacturing_release_manifest() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Machine/postprocessor registry. No proprietary machine format is assumed.
-- -----------------------------------------------------------------------------
create table if not exists public.machine_postprocessor_profiles (
  id text primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  version text not null,
  trust text not null check (trust in ('verified','preview_only','test_only')),
  machine_executable boolean not null default false,
  manufacturer text,
  controller_family text,
  artifact_sha256 text check (artifact_sha256 is null or artifact_sha256 ~ '^[0-9a-f]{64}$'),
  source_kind text not null check (source_kind in ('vendor_sdk','vendor_spec','manual_verified','makster_neutral','test_fixture')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  config_json jsonb not null default '{}'::jsonb check (jsonb_typeof(config_json) = 'object'),
  created_at timestamptz not null default now(),
  constraint postprocessor_verified_chk check (
    trust <> 'verified' or (machine_executable and verified_at is not null and source_kind in ('vendor_sdk','vendor_spec','manual_verified'))
  )
);

create table if not exists public.production_machines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  manufacturer text not null,
  model text not null,
  controller text,
  trust text not null default 'disabled' check (trust in ('verified','test_only','disabled')),
  postprocessor_id text not null references public.machine_postprocessor_profiles(id) on delete restrict,
  capability_json jsonb not null check (jsonb_typeof(capability_json) = 'object'),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_machine_real_verified_chk check (
    trust <> 'verified' or is_enabled = true
  )
);
create index if not exists production_machines_org_idx on public.production_machines(organization_id, is_enabled);

-- -----------------------------------------------------------------------------
-- Durable production state + machine outputs.
-- -----------------------------------------------------------------------------
create table if not exists public.production_queue_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null,
  revision_id uuid not null,
  release_package_id uuid not null,
  approval_request_id uuid not null,
  machine_id uuid not null,
  postprocessor_id text not null,
  status text not null default 'queued' check (status in ('queued','claimed','processing','completed','failed','cancelled')),
  release_manifest_sha256 text not null check (release_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  machine_package_sha256 text not null check (machine_package_sha256 ~ '^[0-9a-f]{64}$'),
  queue_message_id bigint,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  constraint production_queue_revision_fk
    foreign key (revision_id, project_id, organization_id)
    references public.project_revisions(id, project_id, organization_id) on delete restrict,
  constraint production_queue_release_fk
    foreign key (release_package_id, organization_id)
    references public.manufacturing_release_packages(id, organization_id) on delete restrict,
  constraint production_queue_approval_fk
    foreign key (approval_request_id, organization_id)
    references public.production_approval_requests(id, organization_id) on delete restrict,
  constraint production_queue_machine_fk
    foreign key (machine_id) references public.production_machines(id) on delete restrict,
  constraint production_queue_postprocessor_fk
    foreign key (postprocessor_id) references public.machine_postprocessor_profiles(id) on delete restrict,
  constraint production_queue_once unique (release_package_id, machine_id),
  constraint production_queue_id_org_unique unique (id, organization_id)
);
create index if not exists production_queue_status_idx on public.production_queue_jobs(organization_id, status, created_at);

create table if not exists public.production_queue_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  job_id uuid not null,
  event_type text not null check (event_type in ('queued','claimed','processing','completed','failed','cancelled','retry')),
  actor_type text not null check (actor_type in ('user','worker','system')),
  actor_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint production_queue_event_job_fk
    foreign key (job_id, organization_id) references public.production_queue_jobs(id, organization_id) on delete restrict
);
create index if not exists production_queue_events_job_idx on public.production_queue_events(job_id, id);

create table if not exists public.machine_output_artifacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  job_id uuid not null,
  file_name text not null,
  media_type text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  byte_length bigint not null check (byte_length >= 0),
  storage_path text not null,
  created_at timestamptz not null default now(),
  constraint machine_output_job_fk foreign key (job_id, organization_id) references public.production_queue_jobs(id, organization_id) on delete restrict,
  constraint machine_output_unique unique (job_id, file_name),
  constraint machine_output_storage_unique unique (storage_path)
);

-- Machine output files live in the existing private manufacturing bucket under:
-- <org>/<project>/release/<release>/machine/<machine>/<job>/<filename>

-- Live enqueue gate: only a signed approved release may target a verified machine
-- with a verified machine-executable postprocessor. Test-only profiles never reach DB queue.
create or replace function private.validate_production_enqueue()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_release public.manufacturing_release_packages%rowtype;
  v_approval public.production_approval_requests%rowtype;
  v_machine public.production_machines%rowtype;
  v_post public.machine_postprocessor_profiles%rowtype;
begin
  select * into v_release from public.manufacturing_release_packages r
    where r.id = new.release_package_id and r.organization_id = new.organization_id;
  if v_release.id is null or v_release.status <> 'signed' or not v_release.can_release_to_cnc or not v_release.approval_ready then
    raise exception 'production_enqueue_requires_signed_approved_release' using errcode = '23514';
  end if;
  if v_release.project_id <> new.project_id or v_release.revision_id <> new.revision_id or v_release.approval_request_id <> new.approval_request_id then
    raise exception 'production_enqueue_release_identity_mismatch' using errcode = '23514';
  end if;
  select * into v_approval from public.production_approval_requests a
    where a.id = new.approval_request_id and a.organization_id = new.organization_id;
  if v_approval.id is null or v_approval.status <> 'approved' or v_approval.release_id <> new.release_package_id then
    raise exception 'production_enqueue_approval_invalid' using errcode = '23514';
  end if;
  select * into v_machine from public.production_machines m where m.id = new.machine_id and m.organization_id = new.organization_id;
  if v_machine.id is null or v_machine.trust <> 'verified' or not v_machine.is_enabled or v_machine.postprocessor_id <> new.postprocessor_id then
    raise exception 'production_enqueue_machine_not_verified' using errcode = '23514';
  end if;
  select * into v_post from public.machine_postprocessor_profiles p where p.id = new.postprocessor_id and (p.organization_id is null or p.organization_id = new.organization_id);
  if v_post.id is null or v_post.trust <> 'verified' or not v_post.machine_executable then
    raise exception 'production_enqueue_postprocessor_not_verified' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_production_enqueue() from public, anon, authenticated;

drop trigger if exists production_queue_validate on public.production_queue_jobs;
create trigger production_queue_validate
before insert on public.production_queue_jobs
for each row execute function private.validate_production_enqueue();

-- -----------------------------------------------------------------------------
-- Supabase Queues / PGMQ: dispatch only. Do not expose pgmq_public to browser.
-- -----------------------------------------------------------------------------
create extension if not exists pgmq;

do $$
begin
  if not exists (select 1 from pgmq.list_queues() q where q.queue_name = 'makster-production') then
    perform pgmq.create('makster-production');
  end if;
end $$;

create or replace function private.dispatch_production_queue_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_msg_id bigint;
begin
  select * into v_msg_id
  from pgmq.send('makster-production', jsonb_build_object(
    'jobId', new.id,
    'organizationId', new.organization_id,
    'releaseId', new.release_package_id,
    'machineId', new.machine_id
  ));
  update public.production_queue_jobs set queue_message_id = v_msg_id where id = new.id;
  insert into public.production_queue_events(organization_id, job_id, event_type, actor_type, actor_id)
  values(new.organization_id, new.id, 'queued', 'system', 'pgmq-dispatch');
  return new;
end;
$$;
revoke all on function private.dispatch_production_queue_job() from public, anon, authenticated;

drop trigger if exists production_queue_dispatch on public.production_queue_jobs;
create trigger production_queue_dispatch
after insert on public.production_queue_jobs
for each row execute function private.dispatch_production_queue_job();

-- -----------------------------------------------------------------------------
-- RLS: clients inspect Approval Center/Production, server performs mutations.
-- -----------------------------------------------------------------------------
alter table public.production_approval_requests enable row level security;
alter table public.production_approval_decisions enable row level security;
alter table public.machine_postprocessor_profiles enable row level security;
alter table public.production_machines enable row level security;
alter table public.production_queue_jobs enable row level security;
alter table public.production_queue_events enable row level security;
alter table public.machine_output_artifacts enable row level security;

create policy production_approval_requests_select on public.production_approval_requests
for select to authenticated using ((select private.is_org_member(organization_id)));
create policy production_approval_decisions_select on public.production_approval_decisions
for select to authenticated using ((select private.is_org_member(organization_id)));
create policy production_postprocessors_select on public.machine_postprocessor_profiles
for select to authenticated using (organization_id is null or (select private.is_org_member(organization_id)));
create policy production_machines_select on public.production_machines
for select to authenticated using ((select private.is_org_member(organization_id)));
create policy production_queue_jobs_select on public.production_queue_jobs
for select to authenticated using ((select private.is_org_member(organization_id)));
create policy production_queue_events_select on public.production_queue_events
for select to authenticated using ((select private.is_org_member(organization_id)));
create policy machine_output_artifacts_select on public.machine_output_artifacts
for select to authenticated using ((select private.is_org_member(organization_id)));

revoke all on table public.production_approval_requests, public.production_approval_decisions,
  public.machine_postprocessor_profiles, public.production_machines, public.production_queue_jobs,
  public.production_queue_events, public.machine_output_artifacts from anon, authenticated;

grant select on table public.production_approval_requests, public.production_approval_decisions,
  public.machine_postprocessor_profiles, public.production_machines, public.production_queue_jobs,
  public.production_queue_events, public.machine_output_artifacts to authenticated;

grant select, insert, update on table public.production_approval_requests to service_role;
grant select, insert on table public.production_approval_decisions to service_role;
grant select, insert, update on table public.machine_postprocessor_profiles, public.production_machines to service_role;
grant select, insert, update on table public.production_queue_jobs to service_role;
grant select, insert on table public.production_queue_events, public.machine_output_artifacts to service_role;

commit;
