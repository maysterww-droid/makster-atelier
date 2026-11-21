
begin;
do $$
begin
  if to_regclass('public.owner_queue_priority_overrides') is null then raise exception 'missing queue override table'; end if;
  if to_regclass('public.owner_decision_plans') is null then raise exception 'missing decision plans table'; end if;
end $$;
rollback;
