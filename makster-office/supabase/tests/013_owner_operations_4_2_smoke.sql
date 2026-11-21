
-- Makster AI 4.2 staging schema smoke.
begin;
do $$
begin
  if to_regclass('public.owner_production_work_centers') is null then raise exception 'missing work centers'; end if;
  if to_regclass('public.owner_project_capacity_overrides') is null then raise exception 'missing capacity overrides'; end if;
  if to_regclass('public.owner_procurement_awards') is null then raise exception 'missing procurement awards'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='owner_cash_events' and column_name='source_id') then raise exception 'missing cash source lineage'; end if;
end $$;
rollback;
