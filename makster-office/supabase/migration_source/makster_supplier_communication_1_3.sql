-- Makster 1.3 — Supplier Communication
-- RFQ email threads, provider message IDs, structured reply imports, Needs Review and reminder audit.
-- Provider OAuth/refresh secrets are NEVER stored in these public tables.

begin;

alter table public.suppliers
  add column if not exists preferred_language text;
alter table public.suppliers
  drop constraint if exists suppliers_preferred_language_check;
alter table public.suppliers
  add constraint suppliers_preferred_language_check
  check (preferred_language is null or preferred_language in ('en','cs','de','pl'));

create table if not exists public.supplier_communication_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rfq_id uuid not null,
  supplier_id uuid not null,
  communication_version text not null default '1.3.0',
  provider text not null check (provider in ('gmail')),
  provider_account_ref text,
  supplier_email text not null,
  subject text not null,
  response_token_hash text not null check (char_length(response_token_hash)=64),
  status text not null default 'draft' check (status in ('draft','sent','replied','declined','closed')),
  provider_thread_id text,
  root_rfc_message_id text,
  response_deadline timestamptz,
  reminder_count integer not null default 0 check (reminder_count >= 0),
  last_outbound_at timestamptz,
  last_inbound_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, organization_id),
  unique(rfq_id, supplier_id),
  foreign key (rfq_id, organization_id) references public.procurement_rfqs(id, organization_id) on delete cascade,
  foreign key (supplier_id, organization_id) references public.suppliers(id, organization_id) on delete restrict
);

create index if not exists supplier_communication_threads_rfq_idx
  on public.supplier_communication_threads(organization_id, rfq_id, status);
create index if not exists supplier_communication_threads_due_idx
  on public.supplier_communication_threads(organization_id, status, last_outbound_at, response_deadline);

create trigger supplier_communication_threads_touch_updated_at
before update on public.supplier_communication_threads
for each row execute function private.touch_updated_at();

create table if not exists public.supplier_communication_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  thread_id uuid not null,
  direction text not null check (direction in ('outbound','inbound')),
  kind text not null check (kind in ('rfq_invitation','reminder','supplier_reply','quote_received','decline','system')),
  status text not null check (status in ('draft','sent','received','failed')),
  provider_message_id text,
  provider_thread_id text,
  rfc_message_id text,
  in_reply_to_rfc_message_id text,
  subject text not null,
  body_text text not null,
  payload_sha256 text not null check (char_length(payload_sha256)=64),
  error text,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  unique(id, organization_id),
  foreign key (thread_id, organization_id) references public.supplier_communication_threads(id, organization_id) on delete cascade
);

create index if not exists supplier_communication_messages_thread_idx
  on public.supplier_communication_messages(thread_id, created_at);
create unique index if not exists supplier_communication_provider_message_unique
  on public.supplier_communication_messages(organization_id, provider_message_id)
  where provider_message_id is not null;

create table if not exists public.supplier_reply_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  thread_id uuid not null,
  message_id uuid not null,
  rfq_id uuid not null,
  supplier_id uuid not null,
  parser_version text not null default '1.3.0',
  classification text not null check (classification in ('quote_candidate','declined','needs_review')),
  raw_text_sha256 text not null check (char_length(raw_text_sha256)=64),
  parsed_json jsonb not null check (jsonb_typeof(parsed_json)='object'),
  imported_quote_id uuid,
  requires_review boolean not null default false,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (thread_id, organization_id) references public.supplier_communication_threads(id, organization_id) on delete cascade,
  foreign key (message_id, organization_id) references public.supplier_communication_messages(id, organization_id) on delete cascade,
  foreign key (rfq_id, organization_id) references public.procurement_rfqs(id, organization_id) on delete cascade,
  foreign key (supplier_id, organization_id) references public.suppliers(id, organization_id) on delete restrict,
  foreign key (imported_quote_id, organization_id) references public.procurement_supplier_quotes(id, organization_id) on delete set null,
  unique(message_id)
);

create index if not exists supplier_reply_imports_review_idx
  on public.supplier_reply_imports(organization_id, requires_review, created_at desc);

create table if not exists public.supplier_communication_reminder_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  thread_id uuid not null,
  reminder_number integer not null check (reminder_number > 0),
  due_at timestamptz not null,
  status text not null check (status in ('due','sent','skipped','failed')),
  message_id uuid,
  reason text,
  created_at timestamptz not null default now(),
  foreign key (thread_id, organization_id) references public.supplier_communication_threads(id, organization_id) on delete cascade,
  foreign key (message_id, organization_id) references public.supplier_communication_messages(id, organization_id) on delete set null,
  unique(thread_id, reminder_number)
);

alter table public.procurement_rfq_suppliers
  add column if not exists communication_thread_id uuid;
alter table public.procurement_rfq_suppliers
  drop constraint if exists procurement_rfq_suppliers_communication_thread_fk;
alter table public.procurement_rfq_suppliers
  add constraint procurement_rfq_suppliers_communication_thread_fk
  foreign key (communication_thread_id)
  references public.supplier_communication_threads(id)
  on delete set null;

-- RLS: signed-in organization members can inspect communication history.
-- Sending, reply ingestion and reminder mutation stay server-side.
alter table public.supplier_communication_threads enable row level security;
alter table public.supplier_communication_messages enable row level security;
alter table public.supplier_reply_imports enable row level security;
alter table public.supplier_communication_reminder_events enable row level security;

create policy supplier_communication_threads_select_org on public.supplier_communication_threads for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy supplier_communication_messages_select_org on public.supplier_communication_messages for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy supplier_reply_imports_select_org on public.supplier_reply_imports for select to authenticated
using ((select private.is_org_member(organization_id)));
create policy supplier_communication_reminders_select_org on public.supplier_communication_reminder_events for select to authenticated
using ((select private.is_org_member(organization_id)));

revoke all on table public.supplier_communication_threads from anon, authenticated;
revoke all on table public.supplier_communication_messages from anon, authenticated;
revoke all on table public.supplier_reply_imports from anon, authenticated;
revoke all on table public.supplier_communication_reminder_events from anon, authenticated;

grant select on table public.supplier_communication_threads to authenticated;
grant select on table public.supplier_communication_messages to authenticated;
grant select on table public.supplier_reply_imports to authenticated;
grant select on table public.supplier_communication_reminder_events to authenticated;

grant select,insert,update on table public.supplier_communication_threads to service_role;
grant select,insert,update on table public.supplier_communication_messages to service_role;
grant select,insert,update on table public.supplier_reply_imports to service_role;
grant select,insert,update on table public.supplier_communication_reminder_events to service_role;

-- Reminder scheduling belongs to a server-side Edge Function/worker. Current Supabase supports
-- pg_cron + pg_net for scheduled Edge Function calls. OAuth tokens should live in a secure
-- connection store/Vault/secret manager, never in supplier_communication_* tables.

commit;
