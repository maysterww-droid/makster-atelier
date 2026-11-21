
-- Makster AI 4.8.0 — Procurement Automation / Material RFQ Center
begin;

alter table public.owner_supplier_profiles
  add column if not exists email text,
  add column if not exists languages text[] not null default '{}';

alter table public.owner_supplier_quotes
  add column if not exists rfq_id uuid;

create table if not exists public.owner_material_rfqs (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null,
  rfq_json jsonb not null check (jsonb_typeof(rfq_json)='object'),
  updated_at timestamptz not null default now()
);
create index if not exists owner_material_rfqs_status_idx
  on public.owner_material_rfqs(organization_id,status,updated_at desc);

create table if not exists public.owner_material_rfq_communications (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rfq_id uuid not null references public.owner_material_rfqs(id) on delete cascade,
  supplier_id uuid not null references public.owner_supplier_profiles(id) on delete cascade,
  status text not null,
  communication_json jsonb not null check (jsonb_typeof(communication_json)='object'),
  updated_at timestamptz not null default now()
);
create index if not exists owner_material_rfq_comm_idx
  on public.owner_material_rfq_communications(organization_id,rfq_id,supplier_id,status);

alter table public.owner_material_rfqs enable row level security;
alter table public.owner_material_rfq_communications enable row level security;

create policy owner_material_rfqs_select on public.owner_material_rfqs for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));
create policy owner_material_rfq_communications_select on public.owner_material_rfq_communications for select to authenticated
using ((select private.has_org_role(organization_id,array['owner','admin'])));

revoke all on table public.owner_material_rfqs,public.owner_material_rfq_communications from anon,authenticated;
grant select on table public.owner_material_rfqs,public.owner_material_rfq_communications to authenticated;
grant select,insert,update,delete on table public.owner_material_rfqs,public.owner_material_rfq_communications to service_role;

commit;
