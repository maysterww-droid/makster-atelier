
-- Makster AI 5.1 — Integrated Makster AI Office
begin;

create table if not exists public.makster_office_leads (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check (jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.makster_office_campaigns (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check (jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.makster_office_content (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check (jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.makster_office_approvals (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check (jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.makster_office_agent_runs (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check (jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.makster_office_cycles (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check (jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.makster_office_owner_briefs (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check (jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array[
    'makster_office_leads','makster_office_campaigns','makster_office_content',
    'makster_office_approvals','makster_office_agent_runs','makster_office_cycles','makster_office_owner_briefs'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from anon,authenticated',t);
    execute format('grant select on table public.%I to authenticated',t);
    execute format('grant select,insert,update,delete on table public.%I to service_role',t);
  end loop;
end $$;

create policy makster_office_leads_select on public.makster_office_leads for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_office_campaigns_select on public.makster_office_campaigns for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_office_content_select on public.makster_office_content for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_office_approvals_select on public.makster_office_approvals for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_office_agent_runs_select on public.makster_office_agent_runs for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_office_cycles_select on public.makster_office_cycles for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_office_owner_briefs_select on public.makster_office_owner_briefs for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));

commit;
