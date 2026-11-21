
-- Makster AI 4.9.0 — Owner Finance & P&L Intelligence
begin;

create table if not exists public.owner_finance_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_type text not null check (entry_type in ('revenue_recognition','operating_expense','tax','payroll','owner_injection','owner_draw','adjustment')),
  category text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (char_length(currency)=3),
  effective_at timestamptz not null,
  project_id uuid references public.projects(id) on delete set null,
  counterparty text,
  note text,
  source text not null check (source in ('manual','project','cash_event','system')),
  source_id text,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists owner_finance_ledger_period_idx
  on public.owner_finance_ledger(organization_id,currency,effective_at,entry_type);

create table if not exists public.owner_finance_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  currency text not null check (char_length(currency)=3),
  target_gross_margin_percent numeric(6,2) not null default 35,
  target_operating_margin_percent numeric(6,2) not null default 15,
  tax_reserve_percent numeric(6,2) not null default 20,
  runway_safety_months numeric(8,2) not null default 3,
  updated_at timestamptz not null default now(),
  unique(organization_id,currency)
);

alter table public.owner_finance_ledger enable row level security;
alter table public.owner_finance_settings enable row level security;

create policy owner_finance_ledger_select
on public.owner_finance_ledger for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));

create policy owner_finance_settings_select
on public.owner_finance_settings for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));

revoke all on table public.owner_finance_ledger,public.owner_finance_settings from anon,authenticated;
grant select on table public.owner_finance_ledger,public.owner_finance_settings to authenticated;
grant select,insert,update,delete on table public.owner_finance_ledger,public.owner_finance_settings to service_role;

commit;
