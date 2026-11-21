
begin;

create table if not exists public.owner_production_time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  center_kind text not null check (center_kind in ('cutting','edging','drilling','assembly','installation')),
  planned_hours numeric(12,2) not null check (planned_hours > 0),
  actual_hours numeric(12,2) not null check (actual_hours >= 0),
  completed_at timestamptz not null,
  recorded_by text not null,
  note text
);
create index if not exists owner_production_time_entries_kind_idx
  on public.owner_production_time_entries(organization_id,center_kind,completed_at desc);

create table if not exists public.owner_treasury_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  currency text not null check (char_length(currency)=3),
  opening_balance_minor bigint not null,
  as_of timestamptz not null,
  updated_at timestamptz not null default now(),
  unique(organization_id,currency)
);

alter table public.owner_production_time_entries enable row level security;
alter table public.owner_treasury_balances enable row level security;

create policy owner_production_time_entries_select on public.owner_production_time_entries for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy owner_treasury_balances_select on public.owner_treasury_balances for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));

revoke all on table public.owner_production_time_entries,public.owner_treasury_balances from anon,authenticated;
grant select on table public.owner_production_time_entries,public.owner_treasury_balances to authenticated;
grant select,insert,update,delete on table public.owner_production_time_entries,public.owner_treasury_balances to service_role;

commit;
