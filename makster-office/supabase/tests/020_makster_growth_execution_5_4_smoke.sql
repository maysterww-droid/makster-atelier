
begin;
do $$
begin
  if to_regclass('public.makster_growth_guardrails') is null then raise exception 'missing growth guardrails'; end if;
  if to_regclass('public.makster_growth_provider_executions') is null then raise exception 'missing provider executions'; end if;
  if to_regclass('public.makster_growth_audit_log') is null then raise exception 'missing growth audit'; end if;
  if to_regclass('public.makster_growth_inbound_leads') is null then raise exception 'missing inbound leads'; end if;
end $$;
rollback;
