
begin;

create table if not exists public.makster_growth_guardrails(
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check(jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.makster_growth_provider_executions(
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check(jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.makster_growth_audit_log(
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check(jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.makster_growth_inbound_leads(
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_json jsonb not null check(jsonb_typeof(data_json)='object'),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array[
    'makster_growth_guardrails','makster_growth_provider_executions',
    'makster_growth_audit_log','makster_growth_inbound_leads'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from anon,authenticated',t);
    execute format('grant select on table public.%I to authenticated',t);
    execute format('grant select,insert,update,delete on table public.%I to service_role',t);
  end loop;
end $$;

create policy makster_growth_guardrails_select on public.makster_growth_guardrails for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_growth_provider_executions_select on public.makster_growth_provider_executions for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_growth_audit_log_select on public.makster_growth_audit_log for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_growth_inbound_leads_select on public.makster_growth_inbound_leads for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));

commit;
