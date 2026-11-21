-- Makster 1.5 — Procurement Inbox & Connection Operations
-- Prepared migration only. Live Supabase is NOT modified by this file.

begin;

alter table public.gmail_sync_cursors
  add column if not exists last_watch_renew_at timestamptz;

create table if not exists public.procurement_inbox_dispositions (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_key text not null,
  item_id text not null,
  kind text not null check (kind in ('new_quote','needs_review','decline','connection_alert')),
  disposition text not null default 'new' check (disposition in ('new','acknowledged','resolved','dismissed')),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, source_key)
);

create table if not exists public.owner_notifications (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  related_item_id text not null,
  severity text not null check (severity in ('info','warning','critical')),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, related_item_id)
);

create table if not exists public.connection_operations_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.organization_connections(id) on delete cascade,
  operation_kind text not null check (operation_kind in ('daily_safety_sync','watch_renewal','health_check')),
  status text not null check (status in ('ok','warning','error')),
  action_json jsonb not null default '{}'::jsonb check (jsonb_typeof(action_json)='object'),
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists procurement_inbox_dispositions_org_idx on public.procurement_inbox_dispositions(organization_id, disposition, updated_at desc);
create index if not exists owner_notifications_org_idx on public.owner_notifications(organization_id, read_at, created_at desc);
create index if not exists connection_operations_runs_connection_idx on public.connection_operations_runs(connection_id, started_at desc);

alter table public.procurement_inbox_dispositions enable row level security;
alter table public.owner_notifications enable row level security;
alter table public.connection_operations_runs enable row level security;

create policy procurement_inbox_dispositions_select_org
on public.procurement_inbox_dispositions for select to authenticated
using ((select private.is_org_member(organization_id)));

create policy owner_notifications_select_org
on public.owner_notifications for select to authenticated
using ((select private.is_org_member(organization_id)));

create policy connection_operations_runs_select_org
on public.connection_operations_runs for select to authenticated
using ((select private.is_org_member(organization_id)));

revoke all on table public.procurement_inbox_dispositions from public, anon, authenticated;
revoke all on table public.owner_notifications from public, anon, authenticated;
revoke all on table public.connection_operations_runs from public, anon, authenticated;

grant select on table public.procurement_inbox_dispositions to authenticated;
grant select on table public.owner_notifications to authenticated;
grant select on table public.connection_operations_runs to authenticated;

grant select,insert,update,delete on table public.procurement_inbox_dispositions to service_role;
grant select,insert,update,delete on table public.owner_notifications to service_role;
grant select,insert,update,delete on table public.connection_operations_runs to service_role;

commit;

-- Scheduling contract (do not hard-code secrets in SQL migration):
-- Run POST /api/v1/operations/connections/gmail/run once daily from a trusted
-- server scheduler / Edge Function. If using Supabase Cron + pg_net, store the
-- target URL and authorization material in Supabase Vault and invoke the server
-- endpoint from the scheduled job. The application runs sync BEFORE watch renewal.
