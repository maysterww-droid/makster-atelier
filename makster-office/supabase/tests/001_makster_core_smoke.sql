-- Makster Core smoke assertions. Run after the Core 0.1 migration.
-- Designed as plain SQL so it can be used from SQL Editor or wrapped in pgTAP later.

do $$
declare
  v_missing text[] := array[]::text[];
  v_name text;
begin
  foreach v_name in array array[
    'organizations','organization_members','clients','projects',
    'project_revisions','project_files','audit_logs'
  ] loop
    if to_regclass('public.' || v_name) is null then
      v_missing := array_append(v_missing, v_name);
    end if;
  end loop;
  if cardinality(v_missing) > 0 then
    raise exception 'Missing Core tables: %', array_to_string(v_missing, ', ');
  end if;
end $$;

do $$
declare
  v_table text;
  v_rls boolean;
begin
  foreach v_table in array array[
    'organizations','organization_members','clients','projects',
    'project_revisions','project_files','audit_logs'
  ] loop
    select relrowsecurity into v_rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relname=v_table;
    if not coalesce(v_rls,false) then
      raise exception 'RLS is not enabled on public.%', v_table;
    end if;
  end loop;
end $$;

do $$
begin
  if has_table_privilege('anon','public.projects','SELECT') then
    raise exception 'anon must not have SELECT on public.projects';
  end if;
  if not has_table_privilege('authenticated','public.projects','SELECT') then
    raise exception 'authenticated must have SELECT on public.projects';
  end if;
  if has_column_privilege('authenticated','public.projects','created_by','INSERT') then
    raise exception 'authenticated must not be able to spoof projects.created_by';
  end if;
  if has_column_privilege('authenticated','public.projects','current_revision_id','UPDATE') then
    raise exception 'authenticated must not update current_revision_id directly';
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.create_project_with_initial_revision(uuid,uuid,text,text,text,jsonb)') is null then
    raise exception 'Atomic create_project_with_initial_revision RPC is missing';
  end if;
end $$;
