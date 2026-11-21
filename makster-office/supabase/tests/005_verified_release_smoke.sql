-- Run after applying 0.1 -> 0.7 migrations in a Supabase test database.
begin;

select case when exists (
  select 1 from information_schema.tables
  where table_schema='public' and table_name='manufacturing_release_packages'
) then 1 else 1/0 end as release_packages_exists;

select case when exists (
  select 1 from information_schema.tables
  where table_schema='public' and table_name='manufacturing_release_files'
) then 1 else 1/0 end as release_files_exists;

select case when exists (
  select 1 from information_schema.tables
  where table_schema='public' and table_name='manufacturing_signing_keys'
) then 1 else 1/0 end as signing_keys_exists;

select case when exists (
  select 1 from storage.buckets where id='makster-manufacturing-private' and public=false
) then 1 else 1/0 end as manufacturing_bucket_private;

select case when (
  select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='manufacturing_release_packages'
) then 1 else 1/0 end as release_rls_enabled;

rollback;
