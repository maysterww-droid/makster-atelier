
begin;
create table if not exists public.makster_creative_assets(id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,data_json jsonb not null check(jsonb_typeof(data_json)='object'),updated_at timestamptz not null default now());
create table if not exists public.makster_content_draft_sets(id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,data_json jsonb not null check(jsonb_typeof(data_json)='object'),updated_at timestamptz not null default now());
create table if not exists public.makster_publish_jobs(id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,data_json jsonb not null check(jsonb_typeof(data_json)='object'),updated_at timestamptz not null default now());
create table if not exists public.makster_content_performance(id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,data_json jsonb not null check(jsonb_typeof(data_json)='object'),updated_at timestamptz not null default now());
create table if not exists public.makster_pilot_projects(id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,data_json jsonb not null check(jsonb_typeof(data_json)='object'),updated_at timestamptz not null default now());
create table if not exists public.makster_pilot_runs(id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,data_json jsonb not null check(jsonb_typeof(data_json)='object'),updated_at timestamptz not null default now());
do $$
declare t text;
begin
 foreach t in array array['makster_creative_assets','makster_content_draft_sets','makster_publish_jobs','makster_content_performance','makster_pilot_projects','makster_pilot_runs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from anon,authenticated',t);
  execute format('grant select on table public.%I to authenticated',t);
  execute format('grant select,insert,update,delete on table public.%I to service_role',t);
 end loop;
end $$;
create policy makster_creative_assets_select on public.makster_creative_assets for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_content_draft_sets_select on public.makster_content_draft_sets for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_publish_jobs_select on public.makster_publish_jobs for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_content_performance_select on public.makster_content_performance for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_pilot_projects_select on public.makster_pilot_projects for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_pilot_runs_select on public.makster_pilot_runs for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
commit;
