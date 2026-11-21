-- Makster AI 2.6.0 — Persistent Unified Business Core
-- PREPARED MIGRATION ONLY. Do not apply directly to production before staging acceptance.
-- Depends on Makster Core 0.1, Commercial 1.6, Change Intelligence 1.7,
-- and Client Change Order 1.8 migrations.
--
-- Goals:
--   * eliminate process-local business truth for quote/contract/change-order flows;
--   * preserve exact immutable commercial package + deterministic requote context;
--   * store approval TOKEN HASH only (never raw token);
--   * make accepted Change Order -> Contract/Authorization/status transition atomic;
--   * make inserts idempotent by natural immutable identity.

begin;

-- Current lifecycle status is an append-only event stream. One transition into a
-- given status per quote is enough and makes retries idempotent.
create unique index if not exists client_quote_status_events_quote_status_uq
  on public.client_quote_status_events(quote_id, status);

-- Exact immutable package snapshot. The normalized 1.6 tables remain useful for
-- reporting/querying; this snapshot is the deterministic rehydration source for
-- Core API after restart, including customer-safe generated file contents.
create table if not exists public.commercial_package_snapshots (
  quote_id uuid primary key references public.client_commercial_quotes(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  package_json jsonb not null check (jsonb_typeof(package_json) = 'object'),
  created_at timestamptz not null default now()
);

-- Requote requires the exact pricing/terms/production-route context that produced
-- the base quote. This is immutable because a quote is immutable.
create table if not exists public.commercial_quote_contexts (
  quote_id uuid primary key references public.client_commercial_quotes(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  context_json jsonb not null check (jsonb_typeof(context_json) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists commercial_package_snapshots_project_idx
  on public.commercial_package_snapshots(project_id, created_at desc);
create index if not exists commercial_quote_contexts_project_idx
  on public.commercial_quote_contexts(project_id, created_at desc);

-- Commercial snapshots/contexts are immutable after creation.
drop trigger if exists commercial_package_snapshots_immutable on public.commercial_package_snapshots;
create trigger commercial_package_snapshots_immutable
before update or delete on public.commercial_package_snapshots
for each row execute function private.prevent_commercial_snapshot_mutation();

drop trigger if exists commercial_quote_contexts_immutable on public.commercial_quote_contexts;
create trigger commercial_quote_contexts_immutable
before update or delete on public.commercial_quote_contexts
for each row execute function private.prevent_commercial_snapshot_mutation();

alter table public.commercial_package_snapshots enable row level security;
alter table public.commercial_quote_contexts enable row level security;

create policy commercial_package_snapshots_select_internal
on public.commercial_package_snapshots for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin','technologist'])));

-- Pricing context contains internal costs and is restricted to internal roles.
create policy commercial_quote_contexts_select_internal
on public.commercial_quote_contexts for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin','technologist'])));

revoke all on table public.commercial_package_snapshots, public.commercial_quote_contexts from anon, authenticated;
grant select on table public.commercial_package_snapshots to authenticated;
grant select on table public.commercial_quote_contexts to authenticated;
grant select,insert,update,delete on table public.commercial_package_snapshots, public.commercial_quote_contexts to service_role;

-- Service-only RPCs are used for the private token-hash table because private is
-- deliberately not exposed through PostgREST. Raw approval tokens never enter DB.
create or replace function public.makster_change_order_secret_get_2_6(p_change_order_id uuid)
returns table(approval_token_hash_sha256 text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.approval_token_hash_sha256
  from private.client_change_order_secrets s
  where s.change_order_id = p_change_order_id;
$$;

create or replace function public.makster_change_order_secret_put_2_6(
  p_change_order_id uuid,
  p_approval_token_hash_sha256 text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_approval_token_hash_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_change_order_token_hash';
  end if;
  insert into private.client_change_order_secrets(change_order_id,approval_token_hash_sha256)
  values(p_change_order_id,p_approval_token_hash_sha256)
  on conflict(change_order_id) do update
    set approval_token_hash_sha256=excluded.approval_token_hash_sha256;
end;
$$;

revoke all on function public.makster_change_order_secret_get_2_6(uuid) from public, anon, authenticated;
revoke all on function public.makster_change_order_secret_put_2_6(uuid,text) from public, anon, authenticated;
grant execute on function public.makster_change_order_secret_get_2_6(uuid) to service_role;
grant execute on function public.makster_change_order_secret_put_2_6(uuid,text) to service_role;

-- One DB transaction applies the accepted Change Order. The caller computes the
-- deterministic domain objects; the database verifies immutable bindings and
-- commits order decision, contract, authorization and quote statuses together.
create or replace function public.makster_apply_client_change_order_acceptance_2_6(
  p_organization_id uuid,
  p_order jsonb,
  p_contract jsonb,
  p_authorization jsonb,
  p_base_quote_id uuid,
  p_new_quote_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_change_order_id uuid := (p_order->>'id')::uuid;
  v_contract_id uuid := (p_contract->>'contractId')::uuid;
  v_authorization_id uuid := (p_authorization->>'authorizationId')::uuid;
  v_project_id uuid;
  v_existing_base uuid;
  v_existing_new uuid;
  v_existing_report uuid;
  v_auth_fingerprint text := p_authorization->>'authorizationFingerprintSha256';
  v_existing_auth_fingerprint text;
begin
  if p_order->>'status' <> 'accepted' then
    raise exception 'change_order_not_accepted';
  end if;

  select project_id,base_quote_id,new_quote_id,change_report_id
    into v_project_id,v_existing_base,v_existing_new,v_existing_report
  from public.client_change_orders
  where id=v_change_order_id and organization_id=p_organization_id
  for update;

  if not found then raise exception 'change_order_not_found'; end if;
  if v_existing_base<>p_base_quote_id or v_existing_new<>p_new_quote_id then
    raise exception 'change_order_quote_binding_mismatch';
  end if;
  if (p_contract->>'projectId')::uuid<>v_project_id
     or (p_authorization->>'projectId')::uuid<>v_project_id
     or (p_authorization->>'changeOrderId')::uuid<>v_change_order_id
     or (p_authorization->>'contractId')::uuid<>v_contract_id
     or (p_authorization->>'quoteId')::uuid<>p_new_quote_id then
    raise exception 'accepted_change_order_payload_binding_mismatch';
  end if;

  -- Idempotent retry: same authorization fingerprint means the exact acceptance
  -- was already committed. Any different fingerprint is a conflict.
  select authorization_fingerprint_sha256 into v_existing_auth_fingerprint
  from public.client_revision_authorizations
  where project_id=v_project_id and revision=(p_authorization->>'revision')::integer;
  if found then
    if v_existing_auth_fingerprint=v_auth_fingerprint then
      return jsonb_build_object('status','already_applied','authorizationFingerprintSha256',v_auth_fingerprint);
    end if;
    raise exception 'revision_authorization_conflict';
  end if;

  update public.client_change_orders set
    status='accepted',
    decision_json=p_order->'decision_json',
    sent_at=nullif(p_order->>'sent_at','')::timestamptz,
    viewed_at=nullif(p_order->>'viewed_at','')::timestamptz,
    decided_at=nullif(p_order->>'decided_at','')::timestamptz,
    valid_until=nullif(p_order->>'valid_until','')::timestamptz
  where id=v_change_order_id;

  update public.project_commercial_contracts set
    status=p_contract->>'status',
    current_revision=(p_contract->>'currentRevision')::integer,
    current_quote_id=(p_contract->>'currentQuoteId')::uuid,
    agreed_amount_minor=(p_contract->>'agreedAmountMinor')::bigint,
    payment_template_json=p_contract->'paymentTemplate',
    payment_schedule_json=p_contract->'paymentSchedule',
    fingerprint_sha256=p_contract->>'fingerprintSha256',
    updated_at=(p_contract->>'updatedAt')::timestamptz
  where id=v_contract_id and organization_id=p_organization_id and project_id=v_project_id;
  if not found then raise exception 'commercial_contract_not_found'; end if;

  insert into public.client_revision_authorizations(
    id,organization_id,project_id,revision,quote_id,change_order_id,contract_id,
    accepted_at,agreed_amount_minor,currency,authorization_fingerprint_sha256
  ) values (
    v_authorization_id,p_organization_id,v_project_id,(p_authorization->>'revision')::integer,
    (p_authorization->>'quoteId')::uuid,v_change_order_id,v_contract_id,
    (p_authorization->>'acceptedAt')::timestamptz,(p_authorization->>'agreedAmountMinor')::bigint,
    p_authorization->>'currency',v_auth_fingerprint
  );

  insert into public.client_quote_status_events(organization_id,quote_id,status,created_at)
  values(p_organization_id,p_base_quote_id,'superseded',(p_authorization->>'acceptedAt')::timestamptz)
  on conflict(quote_id,status) do nothing;
  insert into public.client_quote_status_events(organization_id,quote_id,status,created_at)
  values(p_organization_id,p_new_quote_id,'accepted',(p_authorization->>'acceptedAt')::timestamptz)
  on conflict(quote_id,status) do nothing;

  return jsonb_build_object('status','applied','authorizationFingerprintSha256',v_auth_fingerprint);
end;
$$;

revoke all on function public.makster_apply_client_change_order_acceptance_2_6(uuid,jsonb,jsonb,jsonb,uuid,uuid) from public, anon, authenticated;
grant execute on function public.makster_apply_client_change_order_acceptance_2_6(uuid,jsonb,jsonb,jsonb,uuid,uuid) to service_role;

commit;
