
begin;
do $$
begin
  if to_regclass('public.owner_finance_ledger') is null then raise exception 'missing owner_finance_ledger'; end if;
  if to_regclass('public.owner_finance_settings') is null then raise exception 'missing owner_finance_settings'; end if;
end $$;
rollback;
