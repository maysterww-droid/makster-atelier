create or replace function public.quote_append_status(p_quote_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
set search_path = public, private, pg_temp
as $$
declare
  v_org_id uuid;
  v_user_id uuid := auth.uid();
  v_current_status text;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_status not in ('sent','accepted','rejected','expired') then raise exception 'status not allowed'; end if;

  select q.organization_id into v_org_id
  from public.client_commercial_quotes q
  where q.id = p_quote_id
    and private.has_org_role(q.organization_id, array['owner'::text,'admin'::text,'sales'::text,'technologist'::text])
  for update;

  if v_org_id is null then raise exception 'quote not found or role not allowed'; end if;

  select e.status into v_current_status
  from public.client_quote_status_events e
  where e.quote_id = p_quote_id and e.organization_id = v_org_id
  order by e.created_at desc, e.id desc
  limit 1;
  v_current_status := coalesce(v_current_status, 'approved');

  if v_current_status in ('accepted','rejected','expired','superseded') then raise exception 'quote has terminal status'; end if;
  if p_status = 'sent' and v_current_status not in ('approved','sent') then raise exception 'invalid sent transition'; end if;
  if p_status in ('accepted','rejected','expired') and v_current_status not in ('approved','sent') then raise exception 'invalid terminal transition'; end if;

  insert into public.client_quote_status_events (organization_id, quote_id, status, actor_id, note)
  values (v_org_id, p_quote_id, p_status, v_user_id, nullif(btrim(coalesce(p_note,'')),''));
end;
$$;
