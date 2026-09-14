-- MQ 0.2 Phase 2: organization standards plus per-user library favorites/recent usage.

create table if not exists public.quote_module_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  module_key text not null,
  width_mm numeric(10,2) not null,
  height_mm numeric(10,2) not null,
  depth_mm numeric(10,2) not null,
  construction_json jsonb not null default '{}'::jsonb,
  material_refs_json jsonb not null default '{}'::jsonb,
  hardware_refs_json jsonb not null default '{}'::jsonb,
  is_favorite boolean not null default false,
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quote_module_templates_org_idx on public.quote_module_templates (organization_id, updated_at desc);
alter table public.quote_module_templates enable row level security;
drop policy if exists "quote_module_templates_select_org" on public.quote_module_templates;
create policy "quote_module_templates_select_org" on public.quote_module_templates for select to authenticated using (organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and status = 'active'));
drop policy if exists "quote_module_templates_insert_editor" on public.quote_module_templates;
create policy "quote_module_templates_insert_editor" on public.quote_module_templates for insert to authenticated with check (organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and status = 'active' and role in ('owner','admin','sales','designer','technologist')));
drop policy if exists "quote_module_templates_update_editor" on public.quote_module_templates;
create policy "quote_module_templates_update_editor" on public.quote_module_templates for update to authenticated using (organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and status = 'active' and role in ('owner','admin','sales','designer','technologist'))) with check (organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and status = 'active' and role in ('owner','admin','sales','designer','technologist')));
drop policy if exists "quote_module_templates_delete_editor" on public.quote_module_templates;
create policy "quote_module_templates_delete_editor" on public.quote_module_templates for delete to authenticated using (organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and status = 'active' and role in ('owner','admin','sales','designer','technologist')));
grant select, insert, update, delete on public.quote_module_templates to authenticated;

create table if not exists public.quote_library_prefs (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  preset_key text not null,
  is_favorite boolean not null default false,
  use_count integer not null default 0,
  last_used_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id, preset_key)
);
create index if not exists quote_library_prefs_recent_idx on public.quote_library_prefs (organization_id, user_id, last_used_at desc nulls last);
alter table public.quote_library_prefs enable row level security;
drop policy if exists "quote_library_prefs_select_self" on public.quote_library_prefs;
create policy "quote_library_prefs_select_self" on public.quote_library_prefs for select to authenticated using (user_id = (select auth.uid()) and organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and status = 'active'));
drop policy if exists "quote_library_prefs_insert_self" on public.quote_library_prefs;
create policy "quote_library_prefs_insert_self" on public.quote_library_prefs for insert to authenticated with check (user_id = (select auth.uid()) and organization_id in (select organization_id from public.organization_members where user_id = (select auth.uid()) and status = 'active'));
drop policy if exists "quote_library_prefs_update_self" on public.quote_library_prefs;
create policy "quote_library_prefs_update_self" on public.quote_library_prefs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "quote_library_prefs_delete_self" on public.quote_library_prefs;
create policy "quote_library_prefs_delete_self" on public.quote_library_prefs for delete to authenticated using (user_id = (select auth.uid()));
grant select, insert, update, delete on public.quote_library_prefs to authenticated;
