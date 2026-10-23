create or replace function public.quote_record_email_delivery(
  p_quote_id uuid,
  p_access_link_id uuid,
  p_recipient_email text,
  p_status text,
  p_provider_message_id text default null,
  p_error_message text default null
) returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_org_id uuid;
  v_delivery_id uuid := gen_random_uuid();
  v_current_status text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_status not in ('sent','failed') then raise exception 'invalid delivery status'; end if;

  select q.organization_id into v_org_id
  from public.client_commercial_quotes q
  where q.id = p_quote_id
    and private.has_org_role(q.organization_id, array['owner'::text,'admin'::text,'sales'::text,'technologist'::text])
  for update;
  if v_org_id is null then raise exception 'quote not found or role not allowed'; end if;

  if p_access_link_id is not null and not exists (
    select 1 from public.quote_client_access_links l
    where l.id = p_access_link_id and l.quote_id = p_quote_id and l.organization_id = v_org_id
  ) then raise exception 'access link mismatch'; end if;

  insert into public.quote_email_deliveries (
    id, organization_id, quote_id, access_link_id, recipient_email, provider, status,
    provider_message_id, error_message, created_by, sent_at
  ) values (
    v_delivery_id, v_org_id, p_quote_id, p_access_link_id, left(btrim(p_recipient_email),320), 'resend', p_status,
    nullif(left(coalesce(p_provider_message_id,''),300),''), nullif(left(coalesce(p_error_message,''),1000),''), auth.uid(),
    case when p_status='sent' then now() else null end
  );

  if p_status = 'sent' then
    select e.status into v_current_status
    from public.client_quote_status_events e
    where e.quote_id = p_quote_id and e.organization_id = v_org_id
    order by e.created_at desc, e.id desc limit 1;
    v_current_status := coalesce(v_current_status,'approved');

    if v_current_status in ('approved','sent') then
      insert into public.client_quote_status_events (organization_id, quote_id, status, actor_id, note)
      values (v_org_id, p_quote_id, 'sent', auth.uid(), 'Email sent via Resend');
    end if;
  end if;

  return v_delivery_id;
end;
$$;

revoke execute on function public.quote_record_email_delivery(uuid,uuid,text,text,text,text) from anon;
grant execute on function public.quote_record_email_delivery(uuid,uuid,text,text,text,text) to authenticated;
