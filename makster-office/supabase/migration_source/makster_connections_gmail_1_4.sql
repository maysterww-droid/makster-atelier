-- Makster 1.4 — Connections & Live Gmail Sync
-- Prepared migration only. Live Supabase is NOT modified by this file.
-- Access tokens are deliberately not persisted. Refresh tokens are AES-256-GCM encrypted in application code.

begin;

create table if not exists public.organization_connections (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('gmail')),
  account_email text not null,
  scopes text[] not null default '{}',
  status text not null check (status in ('pending','connected','reauth_required','revoked','error')),
  connected_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, account_email),
  unique (id, organization_id)
);

create trigger organization_connections_touch_updated_at
before update on public.organization_connections
for each row execute function private.touch_updated_at();

-- Encrypted secret material. No client role receives any privilege on this table.
create table if not exists public.organization_connection_secrets (
  connection_id uuid primary key references public.organization_connections(id) on delete cascade,
  encrypted_refresh_token jsonb not null check (jsonb_typeof(encrypted_refresh_token)='object'),
  refresh_token_fingerprint_sha256 text not null check (char_length(refresh_token_fingerprint_sha256)=64),
  token_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organization_connection_secrets_touch_updated_at
before update on public.organization_connection_secrets
for each row execute function private.touch_updated_at();

create table if not exists public.gmail_sync_cursors (
  connection_id uuid primary key references public.organization_connections(id) on delete cascade,
  history_id text,
  watch_expiration_at timestamptz,
  watch_topic text,
  sync_status text not null default 'idle' check (sync_status in ('idle','syncing','error')),
  last_sync_at timestamptz,
  last_full_sync_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.gmail_sync_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null references public.organization_connections(id) on delete cascade,
  mode text not null check (mode in ('history','full','push','watch_renewal','disconnect')),
  start_history_id text,
  end_history_id text,
  fetched_message_count integer not null default 0 check (fetched_message_count >= 0),
  matched_message_count integer not null default 0 check (matched_message_count >= 0),
  imported_quote_count integer not null default 0 check (imported_quote_count >= 0),
  status text not null check (status in ('ok','warning','error')),
  detail_json jsonb not null default '{}'::jsonb check (jsonb_typeof(detail_json)='object'),
  created_at timestamptz not null default now()
);

create index if not exists gmail_sync_events_connection_idx
  on public.gmail_sync_events(connection_id, created_at desc);

alter table public.supplier_communication_threads
  add column if not exists connection_id uuid references public.organization_connections(id) on delete set null;

create index if not exists supplier_communication_threads_connection_idx
  on public.supplier_communication_threads(connection_id, status, last_inbound_at);

alter table public.supplier_communication_messages
  add column if not exists provider_history_id text;

-- RLS / explicit Data API privileges.
alter table public.organization_connections enable row level security;
alter table public.organization_connection_secrets enable row level security;
alter table public.gmail_sync_cursors enable row level security;
alter table public.gmail_sync_events enable row level security;

create policy organization_connections_select_org
on public.organization_connections for select to authenticated
using ((select private.is_org_member(organization_id)));

create policy gmail_sync_cursors_select_org
on public.gmail_sync_cursors for select to authenticated
using (
  exists (
    select 1 from public.organization_connections c
    where c.id = connection_id
      and (select private.is_org_member(c.organization_id))
  )
);

create policy gmail_sync_events_select_org
on public.gmail_sync_events for select to authenticated
using ((select private.is_org_member(organization_id)));

revoke all on table public.organization_connections from public, anon, authenticated;
revoke all on table public.organization_connection_secrets from public, anon, authenticated;
revoke all on table public.gmail_sync_cursors from public, anon, authenticated;
revoke all on table public.gmail_sync_events from public, anon, authenticated;

grant select on table public.organization_connections to authenticated;
grant select on table public.gmail_sync_cursors to authenticated;
grant select on table public.gmail_sync_events to authenticated;

grant select,insert,update,delete on table public.organization_connections to service_role;
grant select,insert,update,delete on table public.organization_connection_secrets to service_role;
grant select,insert,update,delete on table public.gmail_sync_cursors to service_role;
grant select,insert,update,delete on table public.gmail_sync_events to service_role;

-- Communication mutation remains server-only. Client roles continue to have SELECT only from 1.3.
grant select,insert,update on table public.supplier_communication_threads to service_role;
grant select,insert,update on table public.supplier_communication_messages to service_role;

commit;
