
begin;
do $$
begin
  if to_regclass('public.makster_office_leads') is null then raise exception 'missing office leads'; end if;
  if to_regclass('public.makster_office_campaigns') is null then raise exception 'missing office campaigns'; end if;
  if to_regclass('public.makster_office_approvals') is null then raise exception 'missing office approvals'; end if;
  if to_regclass('public.makster_office_agent_runs') is null then raise exception 'missing office agent runs'; end if;
  if to_regclass('public.makster_office_owner_briefs') is null then raise exception 'missing office briefs'; end if;
end $$;
rollback;
