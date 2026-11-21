
-- Makster AI 4.7.0 — Operations Control Tower
begin;

create table if not exists public.owner_production_operations (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  center_kind text not null check (center_kind in ('cutting','edging','drilling','assembly','installation')),
  status text not null check (status in ('planned','ready','in_progress','blocked','completed','skipped')),
  operation_json jsonb not null check (jsonb_typeof(operation_json)='object'),
  updated_at timestamptz not null default now(),
  unique(organization_id,project_id,center_kind)
);
create index if not exists owner_production_operations_board_idx
  on public.owner_production_operations(organization_id,status,center_kind,updated_at);

alter table public.owner_production_operations enable row level security;
create policy owner_production_operations_select
on public.owner_production_operations for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));

revoke all on table public.owner_production_operations from anon,authenticated;
grant select on table public.owner_production_operations to authenticated;
grant select,insert,update,delete on table public.owner_production_operations to service_role;

commit;
