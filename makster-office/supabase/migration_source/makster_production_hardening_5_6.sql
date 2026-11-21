
begin;
create table if not exists public.makster_role_policies(id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,data_json jsonb not null check(jsonb_typeof(data_json)='object'),updated_at timestamptz not null default now());
create table if not exists public.makster_operational_incidents(id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,data_json jsonb not null check(jsonb_typeof(data_json)='object'),updated_at timestamptz not null default now());
create table if not exists public.makster_backup_manifests(id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,data_json jsonb not null check(jsonb_typeof(data_json)='object'),updated_at timestamptz not null default now());
create table if not exists public.makster_readiness_snapshots(id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,data_json jsonb not null check(jsonb_typeof(data_json)='object'),updated_at timestamptz not null default now());
do $$
declare t text;
begin
 foreach t in array array['makster_role_policies','makster_operational_incidents','makster_backup_manifests','makster_readiness_snapshots'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from anon,authenticated',t);
  execute format('grant select on table public.%I to authenticated',t);
  execute format('grant select,insert,update,delete on table public.%I to service_role',t);
 end loop;
end $$;
create policy makster_role_policies_select on public.makster_role_policies for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_operational_incidents_select on public.makster_operational_incidents for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_backup_manifests_select on public.makster_backup_manifests for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_readiness_snapshots_select on public.makster_readiness_snapshots for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
commit;
