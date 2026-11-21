
begin;
do $$
begin
  if to_regclass('public.owner_material_rfqs') is null then raise exception 'missing owner_material_rfqs'; end if;
  if to_regclass('public.owner_material_rfq_communications') is null then raise exception 'missing owner_material_rfq_communications'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='owner_supplier_profiles' and column_name='email') then raise exception 'missing supplier email'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='owner_supplier_quotes' and column_name='rfq_id') then raise exception 'missing supplier quote rfq_id'; end if;
end $$;
rollback;
