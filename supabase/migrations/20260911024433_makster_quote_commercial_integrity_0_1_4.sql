drop policy if exists commercial_estimates_insert_quote_author on public.commercial_estimates;
create policy commercial_estimates_insert_quote_author
on public.commercial_estimates for insert
to authenticated
with check (
  commercial_estimates.created_by = (select auth.uid())
  and (select private.has_org_role(
    commercial_estimates.organization_id,
    array['owner'::text, 'admin'::text, 'technologist'::text]
  ))
  and exists (
    select 1 from public.projects p
    where p.id = commercial_estimates.project_id
      and p.organization_id = commercial_estimates.organization_id
  )
  and (
    commercial_estimates.project_revision_id is null
    or exists (
      select 1 from public.project_revisions r
      where r.id = commercial_estimates.project_revision_id
        and r.project_id = commercial_estimates.project_id
        and r.organization_id = commercial_estimates.organization_id
    )
  )
);

drop policy if exists client_commercial_quotes_insert_quote_author on public.client_commercial_quotes;
create policy client_commercial_quotes_insert_quote_author
on public.client_commercial_quotes for insert
to authenticated
with check (
  client_commercial_quotes.created_by = (select auth.uid())
  and (select private.has_org_role(
    client_commercial_quotes.organization_id,
    array['owner'::text, 'admin'::text, 'technologist'::text]
  ))
  and exists (
    select 1 from public.projects p
    where p.id = client_commercial_quotes.project_id
      and p.organization_id = client_commercial_quotes.organization_id
  )
  and exists (
    select 1 from public.commercial_estimates e
    where e.id = client_commercial_quotes.estimate_id
      and e.project_id = client_commercial_quotes.project_id
      and e.organization_id = client_commercial_quotes.organization_id
  )
  and (
    client_commercial_quotes.client_id is null
    or exists (
      select 1 from public.clients c
      where c.id = client_commercial_quotes.client_id
        and c.organization_id = client_commercial_quotes.organization_id
    )
  )
);

drop policy if exists client_quote_status_events_insert_authorized on public.client_quote_status_events;
create policy client_quote_status_events_insert_authorized
on public.client_quote_status_events for insert
to authenticated
with check (
  client_quote_status_events.actor_id = (select auth.uid())
  and (select private.has_org_role(
    client_quote_status_events.organization_id,
    array['owner'::text, 'admin'::text, 'sales'::text, 'technologist'::text]
  ))
  and exists (
    select 1 from public.client_commercial_quotes q
    where q.id = client_quote_status_events.quote_id
      and q.organization_id = client_quote_status_events.organization_id
  )
);

create or replace function public.quote_append_status(
  p_quote_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_org_id uuid;
  v_user_id uuid := auth.uid();
  v_current_status text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_status not in ('sent', 'accepted', 'rejected', 'expired') then
    raise exception 'status not allowed';
  end if;

  select q.organization_id into v_org_id
  from public.client_commercial_quotes q
  where q.id = p_quote_id
    and private.has_org_role(q.organization_id, array['owner'::text, 'admin'::text, 'sales'::text, 'technologist'::text]);

  if v_org_id is null then
    raise exception 'quote not found or role not allowed';
  end if;

  select e.status into v_current_status
  from public.client_quote_status_events e
  where e.quote_id = p_quote_id and e.organization_id = v_org_id
  order by e.created_at desc, e.id desc
  limit 1;

  if v_current_status in ('accepted', 'rejected', 'expired', 'superseded') then
    raise exception 'quote has terminal status';
  end if;

  if p_status = 'sent' and coalesce(v_current_status, 'approved') not in ('approved', 'sent') then
    raise exception 'invalid sent transition';
  end if;

  if p_status in ('accepted', 'rejected', 'expired') and coalesce(v_current_status, 'approved') not in ('approved', 'sent') then
    raise exception 'invalid terminal transition';
  end if;

  insert into public.client_quote_status_events (
    organization_id, quote_id, status, actor_id, note
  ) values (
    v_org_id, p_quote_id, p_status, v_user_id, nullif(btrim(coalesce(p_note, '')), '')
  );
end;
$$;
