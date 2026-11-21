-- Makster Client Change Order & Approval 1.8 — adapted for Unified Business + CAD 2.4
-- PREPARED MIGRATION ONLY. NOT applied to live Supabase by this build.
-- Depends on current Makster commercial schema + change_impact_reports from 1.7 adapted migration.

create table if not exists public.project_commercial_contracts (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  currency text not null,
  status text not null check (status in ('active','completed','cancelled')),
  initial_revision integer not null check (initial_revision >= 1),
  initial_quote_id uuid not null references public.client_commercial_quotes(id) on delete restrict,
  current_revision integer not null check (current_revision >= 1),
  current_quote_id uuid not null references public.client_commercial_quotes(id) on delete restrict,
  agreed_amount_minor bigint not null check (agreed_amount_minor >= 0),
  payment_template_json jsonb not null,
  payment_schedule_json jsonb not null,
  fingerprint_sha256 text not null check (fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.client_change_orders (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  public_reference text not null unique,
  status text not null check (status in ('draft','sent','viewed','accepted','declined','expired','superseded')),
  from_revision integer not null,
  to_revision integer not null check (to_revision > from_revision),
  base_quote_id uuid not null references public.client_commercial_quotes(id) on delete restrict,
  new_quote_id uuid not null references public.client_commercial_quotes(id) on delete restrict,
  change_report_id uuid not null references public.change_impact_reports(id) on delete restrict,
  binding_json jsonb not null,
  summary_json jsonb not null,
  decision_json jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  viewed_at timestamptz,
  decided_at timestamptz,
  valid_until timestamptz
);

create table if not exists private.client_change_order_secrets (
  change_order_id uuid primary key references public.client_change_orders(id) on delete cascade,
  approval_token_hash_sha256 text not null check (approval_token_hash_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.client_revision_authorizations (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  revision integer not null check (revision >= 1),
  quote_id uuid not null references public.client_commercial_quotes(id) on delete restrict,
  change_order_id uuid not null references public.client_change_orders(id) on delete restrict,
  contract_id uuid not null references public.project_commercial_contracts(id) on delete restrict,
  accepted_at timestamptz not null,
  agreed_amount_minor bigint not null check (agreed_amount_minor >= 0),
  currency text not null,
  authorization_fingerprint_sha256 text not null check (authorization_fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  unique (project_id,revision)
);

create index if not exists client_change_orders_project_idx on public.client_change_orders(project_id,to_revision desc,created_at desc);
create index if not exists client_revision_authorizations_project_idx on public.client_revision_authorizations(project_id,revision desc);

create or replace function private.guard_client_change_order_binding()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.organization_id<>old.organization_id or new.project_id<>old.project_id or new.from_revision<>old.from_revision or new.to_revision<>old.to_revision
     or new.base_quote_id<>old.base_quote_id or new.new_quote_id<>old.new_quote_id or new.change_report_id<>old.change_report_id
     or new.binding_json<>old.binding_json or new.summary_json<>old.summary_json then
    raise exception 'client_change_order_binding_is_immutable';
  end if;
  return new;
end; $$;
revoke all on function private.guard_client_change_order_binding() from public,anon,authenticated;
grant execute on function private.guard_client_change_order_binding() to service_role;
drop trigger if exists client_change_orders_binding_guard on public.client_change_orders;
create trigger client_change_orders_binding_guard before update on public.client_change_orders for each row execute function private.guard_client_change_order_binding();

drop trigger if exists client_revision_authorizations_immutable on public.client_revision_authorizations;
create trigger client_revision_authorizations_immutable before update or delete on public.client_revision_authorizations for each row execute function private.prevent_commercial_snapshot_mutation();

alter table public.project_commercial_contracts enable row level security;
alter table public.client_change_orders enable row level security;
alter table public.client_revision_authorizations enable row level security;
create policy project_commercial_contracts_select_org on public.project_commercial_contracts for select to authenticated using ((select private.is_org_member(organization_id)));
create policy client_change_orders_select_org on public.client_change_orders for select to authenticated using ((select private.is_org_member(organization_id)));
create policy client_revision_authorizations_select_org on public.client_revision_authorizations for select to authenticated using ((select private.is_org_member(organization_id)));
revoke all on table public.project_commercial_contracts,public.client_change_orders,public.client_revision_authorizations from anon,authenticated;
revoke all on table private.client_change_order_secrets from public,anon,authenticated;
grant select on table public.project_commercial_contracts,public.client_change_orders,public.client_revision_authorizations to authenticated;
grant select,insert,update,delete on table public.project_commercial_contracts,public.client_change_orders,public.client_revision_authorizations to service_role;
grant select,insert,update,delete on table private.client_change_order_secrets to service_role;
