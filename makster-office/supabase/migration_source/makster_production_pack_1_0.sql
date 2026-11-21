-- Makster 1.0 — Machine-Independent Production Pack
-- Persist exact manual/outsource production packages independently of CNC.

begin;

create table if not exists public.production_packs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  revision_id uuid not null references public.project_revisions(id) on delete restrict,
  engineering_artifact_id uuid references public.engineering_artifacts(id) on delete restrict,
  route text not null check (route in ('manual_workshop','outsource')),
  outsource_preset text check (outsource_preset in ('cutting_only','cutting_edging','cutting_edging_drilling')),
  services text[] not null,
  status text not null default 'draft' check (status in ('draft','ready','sent','cancelled','completed')),
  manifest_version text not null default '1.0.0' check (manifest_version = '1.0.0'),
  manifest_json jsonb not null check (jsonb_typeof(manifest_json) = 'object'),
  manifest_sha256 text not null check (char_length(manifest_sha256)=64),
  ready boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  completed_at timestamptz,
  constraint production_pack_route_preset_chk check (
    (route='manual_workshop' and outsource_preset is null)
    or (route='outsource' and outsource_preset is not null)
  ),
  constraint production_pack_revision_fk
    foreign key (revision_id, project_id, organization_id)
    references public.project_revisions(id, project_id, organization_id)
    on delete restrict,
  constraint production_pack_id_org_unique unique(id, organization_id)
);

create index if not exists production_packs_project_idx on public.production_packs(project_id, created_at desc);
create index if not exists production_packs_org_status_idx on public.production_packs(organization_id, status, created_at desc);

create table if not exists public.production_pack_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  production_pack_id uuid not null,
  file_name text not null check (char_length(file_name) between 1 and 240),
  media_type text not null,
  purpose text not null,
  storage_path text not null,
  sha256 text not null check (char_length(sha256)=64),
  byte_length bigint not null check (byte_length >= 0),
  created_at timestamptz not null default now(),
  foreign key (production_pack_id, organization_id)
    references public.production_packs(id, organization_id)
    on delete cascade,
  unique(production_pack_id, file_name)
);

create index if not exists production_pack_files_pack_idx on public.production_pack_files(production_pack_id);

create table if not exists public.outsource_production_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  production_pack_id uuid not null,
  supplier_name text,
  supplier_reference text,
  status text not null default 'draft' check (status in ('draft','sent','accepted','in_production','ready','received','cancelled')),
  price_currency text,
  quoted_price numeric(14,2),
  promised_at timestamptz,
  sent_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (production_pack_id, organization_id)
    references public.production_packs(id, organization_id)
    on delete restrict,
  unique(production_pack_id)
);

create index if not exists outsource_orders_org_status_idx on public.outsource_production_orders(organization_id, status, created_at desc);

create trigger outsource_orders_touch_updated_at
before update on public.outsource_production_orders
for each row execute function private.touch_updated_at();

alter table public.production_packs enable row level security;
alter table public.production_pack_files enable row level security;
alter table public.outsource_production_orders enable row level security;

create policy production_packs_select_org
on public.production_packs for select to authenticated
using ((select private.is_org_member(organization_id)));

create policy production_pack_files_select_org
on public.production_pack_files for select to authenticated
using ((select private.is_org_member(organization_id)));

create policy outsource_orders_select_org
on public.outsource_production_orders for select to authenticated
using ((select private.is_org_member(organization_id)));

-- Production packages and their hash manifests are server-generated immutable evidence.
-- Browser users can inspect them but cannot forge file hashes or revision binding.
revoke all on table public.production_packs from anon, authenticated;
revoke all on table public.production_pack_files from anon, authenticated;
revoke all on table public.outsource_production_orders from anon, authenticated;

grant select on table public.production_packs to authenticated;
grant select on table public.production_pack_files to authenticated;
grant select on table public.outsource_production_orders to authenticated;

grant select, insert, update on table public.production_packs to service_role;
grant select, insert on table public.production_pack_files to service_role;
grant select, insert, update on table public.outsource_production_orders to service_role;

-- Payload files live in existing private bucket:
-- <org>/<project>/production-pack/<pack-id>/<filename>
-- No new authenticated Storage INSERT policy is created; only trusted server code writes packs.

commit;
