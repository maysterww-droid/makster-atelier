-- Creative Studio persistence proposal. Do not run blindly against production.
create table if not exists public.creative_projects (
 id text primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 brand_id text not null check (brand_id in ('MAKSTER_ATELIER','VYTA')),
 status text not null, payload jsonb not null default '{}'::jsonb, version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists creative_projects_owner_brand_idx on public.creative_projects(owner_id,brand_id);
alter table public.creative_projects enable row level security;
revoke all on public.creative_projects from anon;
grant select,insert,update,delete on public.creative_projects to authenticated;
create policy "creative_projects_select_own" on public.creative_projects for select to authenticated using ((select auth.uid()) = owner_id);
create policy "creative_projects_insert_own" on public.creative_projects for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "creative_projects_update_own" on public.creative_projects for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "creative_projects_delete_own" on public.creative_projects for delete to authenticated using ((select auth.uid()) = owner_id);
