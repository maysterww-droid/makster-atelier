-- Makster Quote 0.2
-- Enforce quote validity and terminal-state rules at the database boundary.

create or replace function public.quote_append_status(p_quote_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_org_id uuid;
  v_user_id uuid := auth.uid();
  v_current_status text;
  v_valid_until timestamptz;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_status not in ('sent','accepted','rejected','expired') then raise exception 'status not allowed'; end if;

  select q.organization_id, q.valid_until into v_org_id, v_valid_until
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
  if v_valid_until < now() and p_status <> 'expired' then raise exception 'quote validity expired'; end if;
  if p_status = 'sent' and v_current_status not in ('approved','sent') then raise exception 'invalid sent transition'; end if;
  if p_status in ('accepted','rejected','expired') and v_current_status not in ('approved','sent') then raise exception 'invalid terminal transition'; end if;

  insert into public.client_quote_status_events (organization_id, quote_id, status, actor_id, note)
  values (v_org_id, p_quote_id, p_status, v_user_id, nullif(btrim(coalesce(p_note,'')),''));
end;
$function$;

create or replace function public.quote_create_client_access_link(p_quote_id uuid, p_token_hash text, p_purpose text default 'share', p_recipient_email text default null, p_expires_at timestamptz default null)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_org_id uuid;
  v_user_id uuid := auth.uid();
  v_quote_valid_until timestamptz;
  v_current_status text;
  v_link_id uuid := gen_random_uuid();
  v_expiry timestamptz;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid token hash'; end if;
  if p_purpose not in ('share','email') then raise exception 'invalid purpose'; end if;

  select q.organization_id, q.valid_until into v_org_id, v_quote_valid_until
  from public.client_commercial_quotes q
  where q.id = p_quote_id
    and private.has_org_role(q.organization_id, array['owner'::text,'admin'::text,'sales'::text,'technologist'::text]);
  if v_org_id is null then raise exception 'quote not found or role not allowed'; end if;

  select e.status into v_current_status
  from public.client_quote_status_events e
  where e.quote_id = p_quote_id and e.organization_id = v_org_id
  order by e.created_at desc, e.id desc
  limit 1;
  v_current_status := coalesce(v_current_status, 'approved');

  if v_quote_valid_until < now() then raise exception 'quote validity expired'; end if;
  if v_current_status not in ('approved','sent') then raise exception 'quote is not deliverable'; end if;

  v_expiry := coalesce(p_expires_at, v_quote_valid_until + interval '30 days');
  if v_expiry <= now() then raise exception 'link expiry must be in the future'; end if;
  if v_expiry > now() + interval '365 days' then raise exception 'link expiry too far'; end if;

  insert into public.quote_client_access_links (
    id, organization_id, quote_id, token_hash, purpose, recipient_email, expires_at, created_by
  ) values (
    v_link_id, v_org_id, p_quote_id, lower(p_token_hash), p_purpose,
    nullif(btrim(coalesce(p_recipient_email,'')), ''), v_expiry, v_user_id
  );
  return v_link_id;
end;
$function$;

create or replace function public.quote_public_snapshot(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_quote public.client_commercial_quotes%rowtype;
  v_link public.quote_client_access_links%rowtype;
  v_status text;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then return null; end if;
  select l.* into v_link
  from public.quote_client_access_links l
  where l.token_hash = lower(p_token_hash)
    and l.revoked_at is null
    and l.expires_at > now();
  if v_link.id is null then return null; end if;

  select q.* into v_quote
  from public.client_commercial_quotes q
  where q.id = v_link.quote_id and q.organization_id = v_link.organization_id;
  if v_quote.id is null then return null; end if;

  select e.status into v_status
  from public.client_quote_status_events e
  where e.quote_id = v_quote.id and e.organization_id = v_quote.organization_id
  order by e.created_at desc, e.id desc limit 1;
  v_status := coalesce(v_status, 'approved');
  if v_quote.valid_until < now() and v_status in ('approved','sent') then v_status := 'expired'; end if;

  return jsonb_build_object(
    'quoteId', v_quote.id,
    'quoteVersion', v_quote.quote_version,
    'issuedAt', v_quote.issued_at,
    'validUntil', v_quote.valid_until,
    'linkExpiresAt', v_link.expires_at,
    'status', v_status,
    'actionAllowed', (v_quote.valid_until >= now() and v_status in ('approved','sent')),
    'quote', v_quote.quote_json
  );
end;
$function$;

create or replace function public.quote_record_email_delivery(p_quote_id uuid, p_access_link_id uuid, p_recipient_email text, p_status text, p_provider_message_id text default null, p_error_message text default null)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_org_id uuid;
  v_delivery_id uuid := gen_random_uuid();
  v_current_status text;
  v_valid_until timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_status not in ('sent','failed') then raise exception 'invalid delivery status'; end if;

  select q.organization_id, q.valid_until into v_org_id, v_valid_until
  from public.client_commercial_quotes q
  where q.id = p_quote_id
    and private.has_org_role(q.organization_id, array['owner'::text,'admin'::text,'sales'::text,'technologist'::text])
  for update;
  if v_org_id is null then raise exception 'quote not found or role not allowed'; end if;

  if p_access_link_id is not null and not exists (
    select 1 from public.quote_client_access_links l
    where l.id = p_access_link_id and l.quote_id = p_quote_id and l.organization_id = v_org_id
  ) then raise exception 'access link mismatch'; end if;

  select e.status into v_current_status
  from public.client_quote_status_events e
  where e.quote_id = p_quote_id and e.organization_id = v_org_id
  order by e.created_at desc, e.id desc limit 1;
  v_current_status := coalesce(v_current_status,'approved');

  if p_status = 'sent' then
    if v_valid_until < now() then raise exception 'quote validity expired'; end if;
    if v_current_status not in ('approved','sent') then raise exception 'quote is not deliverable'; end if;
  end if;

  insert into public.quote_email_deliveries (
    id, organization_id, quote_id, access_link_id, recipient_email, provider, status,
    provider_message_id, error_message, created_by, sent_at
  ) values (
    v_delivery_id, v_org_id, p_quote_id, p_access_link_id, left(btrim(p_recipient_email),320), 'resend', p_status,
    nullif(left(coalesce(p_provider_message_id,''),300),''), nullif(left(coalesce(p_error_message,''),1000),''), auth.uid(),
    case when p_status='sent' then now() else null end
  );

  if p_status = 'sent' then
    insert into public.client_quote_status_events (organization_id, quote_id, status, actor_id, note)
    values (v_org_id, p_quote_id, 'sent', auth.uid(), 'Email sent via Resend');
  end if;

  return v_delivery_id;
end;
$function$;
