-- Makster Change Intelligence 1.7 — adapted for Unified Business + CAD 2.4
-- PREPARED MIGRATION ONLY. NOT applied to live Supabase by this build.
-- Depends on current Makster commercial schema: public.client_commercial_quotes.

alter table public.client_quote_status_events drop constraint if exists client_quote_status_events_status_check;
alter table public.client_quote_status_events add constraint client_quote_status_events_status_check
  check (status in ('draft','approved','sent','accepted','rejected','expired','superseded'));

create table if not exists public.change_impact_reports (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  from_revision integer not null check (from_revision >= 1),
  to_revision integer not null check (to_revision > from_revision),
  base_quote_id uuid references public.client_commercial_quotes(id) on delete set null,
  requote_id uuid references public.client_commercial_quotes(id) on delete set null,
  status text not null check (status in ('no_change','changed','blocked')),
  fingerprint_sha256 text not null check (fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  report_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (organization_id, project_id, from_revision, to_revision, fingerprint_sha256)
);

create table if not exists public.commercial_quote_lineage (
  quote_id uuid primary key references public.client_commercial_quotes(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  supersedes_quote_id uuid not null references public.client_commercial_quotes(id) on delete restrict,
  change_report_id uuid not null references public.change_impact_reports(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists change_impact_reports_project_idx on public.change_impact_reports(project_id,to_revision desc,created_at desc);
create index if not exists commercial_quote_lineage_project_idx on public.commercial_quote_lineage(project_id,created_at desc);

drop trigger if exists change_impact_reports_immutable on public.change_impact_reports;
create trigger change_impact_reports_immutable before update or delete on public.change_impact_reports
for each row execute function private.prevent_commercial_snapshot_mutation();
drop trigger if exists commercial_quote_lineage_immutable on public.commercial_quote_lineage;
create trigger commercial_quote_lineage_immutable before update or delete on public.commercial_quote_lineage
for each row execute function private.prevent_commercial_snapshot_mutation();

alter table public.change_impact_reports enable row level security;
alter table public.commercial_quote_lineage enable row level security;
create policy change_impact_reports_select_org on public.change_impact_reports for select to authenticated using ((select private.is_org_member(organization_id)));
create policy commercial_quote_lineage_select_org on public.commercial_quote_lineage for select to authenticated using ((select private.is_org_member(organization_id)));
revoke all on table public.change_impact_reports, public.commercial_quote_lineage from anon, authenticated;
grant select on table public.change_impact_reports, public.commercial_quote_lineage to authenticated;
grant select,insert,update,delete on table public.change_impact_reports, public.commercial_quote_lineage to service_role;
