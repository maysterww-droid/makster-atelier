select to_regclass('public.project_commercial_contracts') is not null as project_commercial_contracts_exists;
select to_regclass('public.client_change_orders') is not null as client_change_orders_exists;
select to_regclass('public.client_revision_authorizations') is not null as client_revision_authorizations_exists;
select to_regclass('private.client_change_order_secrets') is not null as private_change_order_secrets_exists;
