
begin;
do $$
begin
  if to_regclass('public.makster_office_autopilot_decisions') is null then raise exception 'missing autopilot decisions'; end if;
  if to_regclass('public.makster_office_autopilot_runs') is null then raise exception 'missing autopilot runs'; end if;
end $$;
rollback;
