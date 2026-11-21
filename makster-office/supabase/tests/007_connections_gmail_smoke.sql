-- Makster 1.4 static smoke assertions. Run after applying all migrations in a disposable Supabase project.
do $$
begin
  if to_regclass('public.organization_connections') is null then raise exception 'organization_connections missing'; end if;
  if to_regclass('public.organization_connection_secrets') is null then raise exception 'organization_connection_secrets missing'; end if;
  if to_regclass('public.gmail_sync_cursors') is null then raise exception 'gmail_sync_cursors missing'; end if;
  if to_regclass('public.gmail_sync_events') is null then raise exception 'gmail_sync_events missing'; end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='supplier_communication_threads' and column_name='connection_id') then raise exception 'communication connection_id missing'; end if;
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema='public' and table_name='organization_connection_secrets'
      and grantee in ('anon','authenticated')
  ) then raise exception 'client role must not access OAuth secrets'; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='organization_connections' and column_name='access_token') then raise exception 'access token must never be persisted'; end if;
end $$;
