-- MQ 0.2 Phase 1: structured project measurements and cabinet dimension provenance.

create table if not exists public.quote_project_measurements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  measured_at date,
  measured_by text,
  site_address text,
  room_shape text check (room_shape is null or room_shape in ('straight','l','u','island','other')),
  room_height_mm numeric(10,2) check (room_height_mm is null or room_height_mm > 0),
  wall_a_mm numeric(10,2) check (wall_a_mm is null or wall_a_mm > 0),
  wall_b_mm numeric(10,2) check (wall_b_mm is null or wall_b_mm > 0),
  wall_c_mm numeric(10,2) check (wall_c_mm is null or wall_c_mm > 0),
  wall_d_mm numeric(10,2) check (wall_d_mm is null or wall_d_mm > 0),
  niches_text text,
  windows_text text,
  doors_text text,
  plumbing_text text,
  gas_text text,
  ventilation_text text,
  electrical_text text,
  appliances_text text,
  floor_walls_text text,
  notes text,
  photos_json jsonb not null default '[]'::jsonb check (jsonb_typeof(photos_json) = 'array'),
  status text not null default 'draft' check (status in ('draft','complete')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, project_id)
);

create index if not exists quote_project_measurements_org_project_idx
  on public.quote_project_measurements (organization_id, project_id);

alter table public.quote_project_measurements enable row level security;

create policy "quote_measurements_select_org"
on public.quote_project_measurements for select
to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_project_measurements.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
));

create policy "quote_measurements_insert_editor"
on public.quote_project_measurements for insert
to authenticated
with check (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_project_measurements.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
    and om.role in ('owner','admin','sales','designer','technologist')
));

create policy "quote_measurements_update_editor"
on public.quote_project_measurements for update
to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_project_measurements.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
    and om.role in ('owner','admin','sales','designer','technologist')
))
with check (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_project_measurements.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
    and om.role in ('owner','admin','sales','designer','technologist')
));

create policy "quote_measurements_delete_editor"
on public.quote_project_measurements for delete
to authenticated
using (exists (
  select 1 from public.organization_members om
  where om.organization_id = quote_project_measurements.organization_id
    and om.user_id = (select auth.uid())
    and om.status = 'active'
    and om.role in ('owner','admin','sales','designer','technologist')
));

grant select, insert, update, delete on public.quote_project_measurements to authenticated;

alter table public.quote_cabinets
  add column if not exists dimension_source text not null default 'manual'
    check (dimension_source in ('standard','measurement','manual')),
  add column if not exists measurement_reference text;

comment on column public.quote_cabinets.dimension_source is
  'Where the saved cabinet dimensions came from: Makster standard, project measurement, or manual edit.';
comment on column public.quote_cabinets.measurement_reference is
  'Human-readable measurement reference, for example Wall A or niche 1.';
