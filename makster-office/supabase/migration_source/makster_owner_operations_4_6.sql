
-- Makster AI 4.6.0 — Decision Execution Center
-- Apply after 4.5/4.3 owner-operations migrations.

begin;

create table if not exists public.owner_queue_priority_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  priority integer not null check (priority > 0),
  source_plan_id uuid,
  updated_at timestamptz not null default now(),
  unique(organization_id,project_id)
);

create table if not exists public.owner_decision_plans (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scenario_id text not null,
  status text not null check (status in ('draft','partially_approved','approved','in_execution','completed','cancelled')),
  plan_json jsonb not null check (jsonb_typeof(plan_json)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists owner_decision_plans_status_idx
  on public.owner_decision_plans(organization_id,status,created_at desc);

alter table public.owner_queue_priority_overrides enable row level security;
alter table public.owner_decision_plans enable row level security;

create policy owner_queue_priority_overrides_select
on public.owner_queue_priority_overrides for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));

create policy owner_decision_plans_select
on public.owner_decision_plans for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));

revoke all on table public.owner_queue_priority_overrides,public.owner_decision_plans from anon,authenticated;
grant select on table public.owner_queue_priority_overrides,public.owner_decision_plans to authenticated;
grant select,insert,update,delete on table public.owner_queue_priority_overrides,public.owner_decision_plans to service_role;

commit;
