-- R33 tenant-aware Planner pricing / multi-currency handoff.
-- No organization-specific price data is seeded by this migration.
alter table public.makster_commercial_pricebooks
  add column if not exists organization_id uuid null references public.organizations(id) on delete cascade;
alter table public.makster_commercial_pricebooks
  drop constraint if exists makster_commercial_pricebooks_currency_check;
alter table public.makster_commercial_pricebooks
  add constraint makster_commercial_pricebooks_currency_check check (currency ~ '^[A-Z]{3}$');
drop index if exists public.makster_commercial_pricebooks_one_active;
create unique index if not exists makster_commercial_pricebooks_one_active_per_org
  on public.makster_commercial_pricebooks(organization_id)
  where active = true and organization_id is not null;
create index if not exists makster_commercial_pricebooks_org_active_idx
  on public.makster_commercial_pricebooks(organization_id,active,created_at desc);
alter table public.makster_project_handoffs
  drop constraint if exists makster_project_handoffs_currency_check;
alter table public.makster_project_handoffs
  add constraint makster_project_handoffs_currency_check check (currency ~ '^[A-Z]{3}$');
