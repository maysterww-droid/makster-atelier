select to_regclass('public.commercial_package_snapshots') is not null as commercial_package_snapshots_exists;
select to_regclass('public.commercial_quote_contexts') is not null as commercial_quote_contexts_exists;
select to_regprocedure('public.makster_change_order_secret_get_2_6(uuid)') is not null as token_hash_get_rpc_exists;
select to_regprocedure('public.makster_change_order_secret_put_2_6(uuid,text)') is not null as token_hash_put_rpc_exists;
select to_regprocedure('public.makster_apply_client_change_order_acceptance_2_6(uuid,jsonb,jsonb,jsonb,uuid,uuid)') is not null as atomic_acceptance_rpc_exists;
