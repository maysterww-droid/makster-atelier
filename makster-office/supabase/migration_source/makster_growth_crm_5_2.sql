
begin;
create table if not exists public.makster_growth_connections(
 id uuid primary key, organization_id uuid not null references public.organizations(id) on delete cascade,
 data_json jsonb not null check(jsonb_typeof(data_json)='object'),updated_at timestamptz not null default now());
create table if not exists public.makster_growth_sync_snapshots(
 id uuid primary key, organization_id uuid not null references public.organizations(id) on delete cascade,
 data_json jsonb not null check(jsonb_typeof(data_json)='object'),updated_at timestamptz not null default now());
alter table public.makster_growth_connections enable row level security;
alter table public.makster_growth_sync_snapshots enable row level security;
revoke all on public.makster_growth_connections,public.makster_growth_sync_snapshots from anon,authenticated;
grant select on public.makster_growth_connections,public.makster_growth_sync_snapshots to authenticated;
grant select,insert,update,delete on public.makster_growth_connections,public.makster_growth_sync_snapshots to service_role;
create policy makster_growth_connections_select on public.makster_growth_connections for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy makster_growth_sync_snapshots_select on public.makster_growth_sync_snapshots for select to authenticated using ((select private.has_org_role(organization_id,array['owner','admin'])));
commit;
