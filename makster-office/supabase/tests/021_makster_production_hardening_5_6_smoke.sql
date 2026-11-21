
begin;
do $$
begin
 if to_regclass('public.makster_role_policies') is null then raise exception 'missing role policies'; end if;
 if to_regclass('public.makster_operational_incidents') is null then raise exception 'missing incidents'; end if;
 if to_regclass('public.makster_backup_manifests') is null then raise exception 'missing backup manifests'; end if;
 if to_regclass('public.makster_readiness_snapshots') is null then raise exception 'missing readiness snapshots'; end if;
end $$;
rollback;
