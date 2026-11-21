-- Makster Core 0.9 / Production Worker
-- Queue semantics follow PGMQ read(vt) -> process -> archive on success/terminal.
-- Source of truth remains public.production_queue_jobs; pgmq is dispatch only.
-- Create a real timestamped file first with: supabase migration new makster_production_worker_0_9

begin;

-- -----------------------------------------------------------------------------
-- Freeze the exact machine/postprocessor identity that was approved at enqueue.
-- -----------------------------------------------------------------------------
alter table public.production_queue_jobs
  add column if not exists machine_profile_sha256 text,
  add column if not exists postprocessor_version text,
  add column if not exists postprocessor_artifact_sha256 text,
  add column if not exists max_attempts integer not null default 5,
  add column if not exists worker_id text,
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists next_retry_at timestamptz,
  add column if not exists failure_code text;

alter table public.production_queue_jobs
  add constraint production_queue_machine_profile_sha_chk
    check (machine_profile_sha256 is null or machine_profile_sha256 ~ '^[0-9a-f]{64}$') not valid,
  add constraint production_queue_postprocessor_sha_chk
    check (postprocessor_artifact_sha256 is null or postprocessor_artifact_sha256 ~ '^[0-9a-f]{64}$') not valid,
  add constraint production_queue_max_attempts_chk
    check (max_attempts between 1 and 20) not valid,
  add constraint production_queue_lease_shape_chk check (
    (worker_id is null and lease_token is null and lease_expires_at is null)
    or (worker_id is not null and lease_token is not null and lease_expires_at is not null)
  ) not valid;

create index if not exists production_queue_worker_claim_idx
  on public.production_queue_jobs(status, next_retry_at, lease_expires_at, created_at);

-- New live enqueue rows must carry immutable machine/postprocessor fingerprints.
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
  if v_post.id is null or v_post.trust <> 'verified' or not v_post.machine_executable or v_post.artifact_sha256 is null then
    raise exception 'production_enqueue_postprocessor_not_verified' using errcode = '23514';
  end if;
  if new.machine_profile_sha256 is null or new.machine_profile_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'production_enqueue_machine_profile_hash_required' using errcode = '23514';
  end if;
  if new.postprocessor_version is distinct from v_post.version or new.postprocessor_artifact_sha256 is distinct from v_post.artifact_sha256 then
    raise exception 'production_enqueue_postprocessor_identity_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_production_enqueue() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Worker runtime observability.
-- -----------------------------------------------------------------------------
create table if not exists public.production_worker_runs (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null,
  worker_version text not null,
  status text not null default 'online' check (status in ('online','stopped','error')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  stopped_at timestamptz,
  constraint production_worker_run_id_unique unique (worker_id, id)
);
create index if not exists production_worker_runs_seen_idx on public.production_worker_runs(last_seen_at desc);

-- Extend event vocabulary for the worker lifecycle.
alter table public.production_queue_events drop constraint if exists production_queue_events_event_type_check;
alter table public.production_queue_events
  add constraint production_queue_events_event_type_check check (
    event_type in ('queued','claimed','processing','heartbeat','artifact_written','completed','failed','cancelled','retry','archived','dead_letter','lease_lost')
  );

-- Machine output metadata is immutable and carries the exact generating identity.
alter table public.machine_output_artifacts
  add column if not exists worker_id text,
  add column if not exists release_manifest_sha256 text,
  add column if not exists machine_package_sha256 text,
  add column if not exists postprocessor_id text,
  add column if not exists postprocessor_version text,
  add column if not exists verified_at timestamptz;

alter table public.machine_output_artifacts
  add constraint machine_output_release_sha_chk check (release_manifest_sha256 is null or release_manifest_sha256 ~ '^[0-9a-f]{64}$') not valid,
  add constraint machine_output_package_sha_chk check (machine_package_sha256 is null or machine_package_sha256 ~ '^[0-9a-f]{64}$') not valid;

create or replace function private.prevent_machine_output_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'machine_output_artifacts_are_immutable' using errcode = '55000';
end; $$;
revoke all on function private.prevent_machine_output_mutation() from public, anon, authenticated;
drop trigger if exists machine_output_artifacts_immutable on public.machine_output_artifacts;
create trigger machine_output_artifacts_immutable before update or delete on public.machine_output_artifacts
for each row execute function private.prevent_machine_output_mutation();

-- -----------------------------------------------------------------------------
-- Service-role-only worker RPC facade. pgmq_public remains unexposed.
-- -----------------------------------------------------------------------------
create or replace function public.production_worker_register(
  p_worker_id text,
  p_worker_version text,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_worker_id is null or length(p_worker_id) < 3 then raise exception 'worker_id_required' using errcode='22023'; end if;
  insert into public.production_worker_runs(worker_id, worker_version, metadata)
  values(p_worker_id, p_worker_version, coalesce(p_metadata,'{}'::jsonb)) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.production_worker_register(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.production_worker_register(text,text,jsonb) to service_role;

create or replace function public.production_worker_claim(
  p_worker_id text,
  p_visibility_timeout_seconds integer default 300
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_msg record;
  v_job public.production_queue_jobs%rowtype;
  v_lease uuid;
  v_try integer := 0;
  v_delay integer;
begin
  if p_visibility_timeout_seconds < 30 or p_visibility_timeout_seconds > 3600 then
    raise exception 'invalid_visibility_timeout' using errcode='22023';
  end if;
  loop
    v_try := v_try + 1;
    if v_try > 10 then return null; end if;
    select * into v_msg from pgmq.read('makster-production', p_visibility_timeout_seconds, 1) limit 1;
    if v_msg.msg_id is null then return null; end if;

    select * into v_job from public.production_queue_jobs j
      where j.id = (v_msg.message->>'jobId')::uuid for update;
    if v_job.id is null then
      perform pgmq.archive('makster-production', v_msg.msg_id);
      continue;
    end if;
    if v_job.status in ('completed','cancelled','failed') then
      perform pgmq.archive('makster-production', v_msg.msg_id);
      continue;
    end if;
    if v_job.next_retry_at is not null and v_job.next_retry_at > now() then
      v_delay := greatest(1, ceil(extract(epoch from (v_job.next_retry_at-now())))::integer);
      perform pgmq.set_vt('makster-production', v_msg.msg_id, v_delay);
      continue;
    end if;
    if v_job.status in ('claimed','processing') and v_job.lease_expires_at is not null and v_job.lease_expires_at > now() then
      v_delay := greatest(1, ceil(extract(epoch from (v_job.lease_expires_at-now())))::integer);
      perform pgmq.set_vt('makster-production', v_msg.msg_id, v_delay);
      continue;
    elsif v_job.status in ('claimed','processing') and v_job.lease_expires_at is not null and v_job.lease_expires_at <= now() then
      insert into public.production_queue_events(organization_id,job_id,event_type,actor_type,actor_id,payload)
      values(v_job.organization_id,v_job.id,'lease_lost','system','production-worker-claim',jsonb_build_object('previousWorkerId',v_job.worker_id,'previousLeaseExpiredAt',v_job.lease_expires_at));
    end if;
    if v_job.attempt_count >= v_job.max_attempts then
      update public.production_queue_jobs set status='failed', failure_code='MAX_ATTEMPTS_EXCEEDED', last_error='worker max attempts exceeded',
        worker_id=null, lease_token=null, lease_expires_at=null where id=v_job.id;
      perform pgmq.archive('makster-production', v_msg.msg_id);
      insert into public.production_queue_events(organization_id,job_id,event_type,actor_type,actor_id,payload)
      values(v_job.organization_id,v_job.id,'dead_letter','system','production-worker-claim',jsonb_build_object('reason','max_attempts'));
      continue;
    end if;

    v_lease := gen_random_uuid();
    update public.production_queue_jobs set
      status='claimed', attempt_count=attempt_count+1, worker_id=p_worker_id, lease_token=v_lease,
      queue_message_id=v_msg.msg_id, lease_expires_at=now()+make_interval(secs=>p_visibility_timeout_seconds),
      last_heartbeat_at=now(), failure_code=null, last_error=null, next_retry_at=null
    where id=v_job.id returning * into v_job;
    insert into public.production_queue_events(organization_id,job_id,event_type,actor_type,actor_id,payload)
    values(v_job.organization_id,v_job.id,'claimed','worker',p_worker_id,jsonb_build_object('attempt',v_job.attempt_count,'messageId',v_msg.msg_id,'readCount',v_msg.read_ct));
    return jsonb_build_object(
      'job', to_jsonb(v_job), 'messageId', v_msg.msg_id, 'readCount', v_msg.read_ct,
      'workerId', p_worker_id, 'leaseToken', v_lease,
      'leaseExpiresAt', v_job.lease_expires_at
    );
  end loop;
end; $$;
revoke all on function public.production_worker_claim(text,integer) from public, anon, authenticated;
grant execute on function public.production_worker_claim(text,integer) to service_role;

create or replace function private.assert_worker_lease(p_job_id uuid,p_worker_id text,p_lease_token uuid)
returns public.production_queue_jobs
language plpgsql security definer set search_path = '' as $$
declare v_job public.production_queue_jobs%rowtype;
begin
  select * into v_job from public.production_queue_jobs where id=p_job_id for update;
  if v_job.id is null then raise exception 'worker_job_not_found' using errcode='P0002'; end if;
  if v_job.worker_id is distinct from p_worker_id or v_job.lease_token is distinct from p_lease_token
     or v_job.lease_expires_at is null or v_job.lease_expires_at <= now() then
    raise exception 'worker_lease_lost' using errcode='55000';
  end if;
  return v_job;
end; $$;
revoke all on function private.assert_worker_lease(uuid,text,uuid) from public, anon, authenticated;

create or replace function public.production_worker_mark_processing(p_job_id uuid,p_worker_id text,p_lease_token uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_job public.production_queue_jobs%rowtype;
begin
  v_job := private.assert_worker_lease(p_job_id,p_worker_id,p_lease_token);
  update public.production_queue_jobs set status='processing', processing_started_at=coalesce(processing_started_at,now()) where id=p_job_id;
  insert into public.production_queue_events(organization_id,job_id,event_type,actor_type,actor_id)
  values(v_job.organization_id,p_job_id,'processing','worker',p_worker_id);
end; $$;
revoke all on function public.production_worker_mark_processing(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.production_worker_mark_processing(uuid,text,uuid) to service_role;

create or replace function public.production_worker_heartbeat(p_job_id uuid,p_worker_id text,p_lease_token uuid,p_visibility_timeout_seconds integer default 300)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_job public.production_queue_jobs%rowtype; v_until timestamptz;
begin
  v_job := private.assert_worker_lease(p_job_id,p_worker_id,p_lease_token);
  if v_job.queue_message_id is null then raise exception 'queue_message_id_missing' using errcode='55000'; end if;
  perform pgmq.set_vt('makster-production',v_job.queue_message_id,p_visibility_timeout_seconds);
  v_until := now()+make_interval(secs=>p_visibility_timeout_seconds);
  update public.production_queue_jobs set lease_expires_at=v_until,last_heartbeat_at=now() where id=p_job_id;
  insert into public.production_queue_events(organization_id,job_id,event_type,actor_type,actor_id)
  values(v_job.organization_id,p_job_id,'heartbeat','worker',p_worker_id);
  return v_until;
end; $$;
revoke all on function public.production_worker_heartbeat(uuid,text,uuid,integer) from public, anon, authenticated;
grant execute on function public.production_worker_heartbeat(uuid,text,uuid,integer) to service_role;

create or replace function public.production_worker_retry(
  p_job_id uuid,p_worker_id text,p_lease_token uuid,p_failure_code text,p_error text,p_delay_seconds integer
) returns void language plpgsql security definer set search_path = '' as $$
declare v_job public.production_queue_jobs%rowtype;
begin
  v_job := private.assert_worker_lease(p_job_id,p_worker_id,p_lease_token);
  if v_job.queue_message_id is null then raise exception 'queue_message_id_missing' using errcode='55000'; end if;
  if p_delay_seconds < 1 or p_delay_seconds > 86400 then raise exception 'invalid_retry_delay' using errcode='22023'; end if;
  perform pgmq.set_vt('makster-production',v_job.queue_message_id,p_delay_seconds);
  update public.production_queue_jobs set status='queued',failure_code=p_failure_code,last_error=left(p_error,4000),next_retry_at=now()+make_interval(secs=>p_delay_seconds),
    worker_id=null,lease_token=null,lease_expires_at=null where id=p_job_id;
  insert into public.production_queue_events(organization_id,job_id,event_type,actor_type,actor_id,payload)
  values(v_job.organization_id,p_job_id,'retry','worker',p_worker_id,jsonb_build_object('failureCode',p_failure_code,'delaySeconds',p_delay_seconds));
end; $$;
revoke all on function public.production_worker_retry(uuid,text,uuid,text,text,integer) from public, anon, authenticated;
grant execute on function public.production_worker_retry(uuid,text,uuid,text,text,integer) to service_role;

create or replace function public.production_worker_complete(
  p_job_id uuid,p_worker_id text,p_lease_token uuid,p_artifacts jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare v_job public.production_queue_jobs%rowtype; v_art jsonb; v_existing public.machine_output_artifacts%rowtype;
begin
  v_job := private.assert_worker_lease(p_job_id,p_worker_id,p_lease_token);
  if jsonb_typeof(p_artifacts) <> 'array' or jsonb_array_length(p_artifacts)=0 then raise exception 'worker_artifacts_required' using errcode='22023'; end if;
  for v_art in select value from jsonb_array_elements(p_artifacts)
  loop
    if (v_art->>'path') not like (v_job.organization_id::text || '/' || v_job.project_id::text || '/release/' || v_job.release_package_id::text || '/machine/' || v_job.machine_id::text || '/' || v_job.id::text || '/%') then
      raise exception 'machine_output_path_mismatch' using errcode='23514';
    end if;
    select * into v_existing from public.machine_output_artifacts where job_id=v_job.id and file_name=v_art->>'fileName';
    if v_existing.id is not null then
      if v_existing.sha256 is distinct from v_art->>'sha256' or v_existing.storage_path is distinct from v_art->>'path' then
        raise exception 'machine_output_artifact_conflict' using errcode='23505';
      end if;
    else
      insert into public.machine_output_artifacts(
        organization_id,job_id,file_name,media_type,sha256,byte_length,storage_path,worker_id,
        release_manifest_sha256,machine_package_sha256,postprocessor_id,postprocessor_version,verified_at
      ) values (
        v_job.organization_id,v_job.id,v_art->>'fileName',v_art->>'mediaType',v_art->>'sha256',(v_art->>'byteLength')::bigint,v_art->>'path',p_worker_id,
        v_job.release_manifest_sha256,v_job.machine_package_sha256,v_job.postprocessor_id,v_job.postprocessor_version,now()
      );
      insert into public.production_queue_events(organization_id,job_id,event_type,actor_type,actor_id,payload)
      values(v_job.organization_id,v_job.id,'artifact_written','worker',p_worker_id,jsonb_build_object('fileName',v_art->>'fileName','sha256',v_art->>'sha256'));
    end if;
  end loop;
  update public.production_queue_jobs set status='completed',completed_at=now(),worker_id=null,lease_token=null,lease_expires_at=null where id=v_job.id;
  perform pgmq.archive('makster-production',v_job.queue_message_id);
  insert into public.production_queue_events(organization_id,job_id,event_type,actor_type,actor_id,payload)
  values(v_job.organization_id,v_job.id,'completed','worker',p_worker_id,jsonb_build_object('artifactCount',jsonb_array_length(p_artifacts)));
  insert into public.production_queue_events(organization_id,job_id,event_type,actor_type,actor_id,payload)
  values(v_job.organization_id,v_job.id,'archived','worker',p_worker_id,jsonb_build_object('messageId',v_job.queue_message_id));
end; $$;
revoke all on function public.production_worker_complete(uuid,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.production_worker_complete(uuid,text,uuid,jsonb) to service_role;

create or replace function public.production_worker_fail_terminal(
  p_job_id uuid,p_worker_id text,p_lease_token uuid,p_failure_code text,p_error text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_job public.production_queue_jobs%rowtype;
begin
  v_job := private.assert_worker_lease(p_job_id,p_worker_id,p_lease_token);
  update public.production_queue_jobs set status='failed',failure_code=p_failure_code,last_error=left(p_error,4000),worker_id=null,lease_token=null,lease_expires_at=null where id=v_job.id;
  if v_job.queue_message_id is not null then perform pgmq.archive('makster-production',v_job.queue_message_id); end if;
  insert into public.production_queue_events(organization_id,job_id,event_type,actor_type,actor_id,payload)
  values(v_job.organization_id,v_job.id,'failed','worker',p_worker_id,jsonb_build_object('failureCode',p_failure_code));
  insert into public.production_queue_events(organization_id,job_id,event_type,actor_type,actor_id,payload)
  values(v_job.organization_id,v_job.id,'dead_letter','worker',p_worker_id,jsonb_build_object('failureCode',p_failure_code,'messageId',v_job.queue_message_id));
end; $$;
revoke all on function public.production_worker_fail_terminal(uuid,text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.production_worker_fail_terminal(uuid,text,uuid,text,text) to service_role;

-- -----------------------------------------------------------------------------
-- RLS / grants. Worker runs are visible to org-independent admins only server-side
-- for now; production queue remains readable to organization members via v0.8 policy.
-- -----------------------------------------------------------------------------
alter table public.production_worker_runs enable row level security;
revoke all on table public.production_worker_runs from anon, authenticated;
grant select,insert,update on table public.production_worker_runs to service_role;

grant select,insert on table public.machine_output_artifacts to service_role;
grant select,update on table public.production_queue_jobs to service_role;
grant select,insert on table public.production_queue_events to service_role;

commit;
