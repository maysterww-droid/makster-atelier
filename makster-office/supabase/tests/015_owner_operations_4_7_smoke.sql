
begin;
do $$
begin
  if to_regclass('public.owner_production_operations') is null then raise exception 'missing production operations'; end if;
  if not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='owner_production_operations' and column_name='operation_json'
  ) then raise exception 'missing operation_json'; end if;
end $$;
rollback;
