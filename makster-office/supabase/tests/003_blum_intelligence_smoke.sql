-- Run after makster_blum_intelligence_0_4.
begin;

do $$
begin
  if to_regclass('public.hardware_catalog_items') is null then
    raise exception 'hardware_catalog_items missing';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.hardware_catalog_items'::regclass) then
    raise exception 'RLS disabled on hardware_catalog_items';
  end if;
  if has_table_privilege('anon', 'public.hardware_catalog_items', 'SELECT') then
    raise exception 'anon must not read hardware catalog';
  end if;
  if not has_table_privilege('authenticated', 'public.hardware_catalog_items', 'SELECT') then
    raise exception 'authenticated SELECT missing on hardware catalog';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='engineering_artifacts' and column_name='cnc_ready'
  ) then
    raise exception 'engineering_artifacts.cnc_ready missing';
  end if;
end;
$$;

rollback;
