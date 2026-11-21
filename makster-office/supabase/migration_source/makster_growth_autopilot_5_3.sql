
begin;

create table if not exists public.makster_office_autopilot_decisions(
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check(jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);

create table if not exists public.makster_office_autopilot_runs(
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check(jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);

alter table public.makster_office_autopilot_decisions enable row level security;
alter table public.makster_office_autopilot_runs enable row level security;

revoke all on public.makster_office_autopilot_decisions,public.makster_office_autopilot_runs from anon,authenticated;
grant select on public.makster_office_autopilot_decisions,public.makster_office_autopilot_runs to authenticated;
grant select,insert,update,delete on public.makster_office_autopilot_decisions,public.makster_office_autopilot_runs to service_role;

create policy makster_office_autopilot_decisions_select on public.makster_office_autopilot_decisions
for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));

create policy makster_office_autopilot_runs_select on public.makster_office_autopilot_runs
for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));

commit;
