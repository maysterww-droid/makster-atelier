
-- Makster AI 4.1 Owner Operations staging smoke.
-- Run after makster_owner_operations_4_1.sql with a known organization/project.
-- This file intentionally validates schema/function presence without mutating production data.

begin;

do $$
begin
  if to_regclass('public.owner_warehouse_items') is null then raise exception 'missing owner_warehouse_items'; end if;
  if to_regclass('public.owner_warehouse_reservations') is null then raise exception 'missing owner_warehouse_reservations'; end if;
  if to_regclass('public.owner_supplier_profiles') is null then raise exception 'missing owner_supplier_profiles'; end if;
  if to_regclass('public.owner_supplier_quotes') is null then raise exception 'missing owner_supplier_quotes'; end if;
  if to_regclass('public.owner_cash_events') is null then raise exception 'missing owner_cash_events'; end if;
  if to_regclass('public.owner_fixed_monthly_costs') is null then raise exception 'missing owner_fixed_monthly_costs'; end if;
  if to_regprocedure('public.owner_reserve_warehouse_stock(uuid,uuid,uuid,numeric,integer,text)') is null then raise exception 'missing reserve RPC'; end if;
  if to_regprocedure('public.owner_adjust_warehouse_stock(uuid,uuid,numeric)') is null then raise exception 'missing adjust RPC'; end if;
  if to_regprocedure('public.owner_set_reservation_status(uuid,uuid,text)') is null then raise exception 'missing reservation status RPC'; end if;
end $$;

rollback;
