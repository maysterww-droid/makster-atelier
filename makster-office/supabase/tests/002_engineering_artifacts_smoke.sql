-- Makster Engineering 0.3 smoke checks.
-- Run after makster_core_0_1 and makster_engineering_0_3.

begin;

do $$
begin
  if to_regclass('public.engineering_artifacts') is null then
    raise exception 'engineering_artifacts missing';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.engineering_artifacts'::regclass) then
    raise exception 'RLS disabled on engineering_artifacts';
  end if;

  if not has_table_privilege('authenticated', 'public.engineering_artifacts', 'SELECT') then
    raise exception 'authenticated SELECT missing';
  end if;

  if has_table_privilege('authenticated', 'public.engineering_artifacts', 'INSERT') then
    raise exception 'authenticated must not INSERT engineering artifacts';
  end if;

  if not has_table_privilege('service_role', 'public.engineering_artifacts', 'INSERT') then
    raise exception 'service_role INSERT missing';
  end if;
end;
$$;

rollback;
