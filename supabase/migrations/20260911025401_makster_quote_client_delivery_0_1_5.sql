create table if not exists public.quote_client_access_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.client_commercial_quotes(id) on delete cascade,
  token_hash text not null unique,
  purpose text not null default 'share' check (purpose in ('share','email')),
  recipient_email text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint quote_client_access_links_token_hash_check check (token_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists quote_client_access_links_quote_idx
  on public.quote_client_access_links (organization_id, quote_id, created_at desc);
create index if not exists quote_client_access_links_active_idx
  on public.quote_client_access_links (token_hash)
  where revoked_at is null;

alter table public.quote_client_access_links enable row level security;
revoke all on public.quote_client_access_links from anon;
revoke insert, update, delete on public.quote_client_access_links from authenticated;
grant select on public.quote_client_access_links to authenticated;

drop policy if exists quote_client_access_links_select_org on public.quote_client_access_links;
create policy quote_client_access_links_select_org
on public.quote_client_access_links for select to authenticated
using (private.is_org_member(organization_id));

create table if not exists public.quote_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.client_commercial_quotes(id) on delete cascade,
  access_link_id uuid references public.quote_client_access_links(id) on delete set null,
  recipient_email text not null,
  provider text not null default 'resend',
  status text not null check (status in ('sent','failed')),
  provider_message_id text,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists quote_email_deliveries_quote_idx
  on public.quote_email_deliveries (organization_id, quote_id, created_at desc);

alter table public.quote_email_deliveries enable row level security;
revoke all on public.quote_email_deliveries from anon;
revoke insert, update, delete on public.quote_email_deliveries from authenticated;
grant select on public.quote_email_deliveries to authenticated;

drop policy if exists quote_email_deliveries_select_org on public.quote_email_deliveries;
create policy quote_email_deliveries_select_org
on public.quote_email_deliveries for select to authenticated
using (private.is_org_member(organization_id));

create or replace function public.quote_create_client_access_link(
  p_quote_id uuid,
  p_token_hash text,
  p_purpose text default 'share',
  p_recipient_email text default null,
  p_expires_at timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_org_id uuid;
  v_user_id uuid := auth.uid();
  v_quote_valid_until timestamptz;
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
$$;

revoke all on function public.quote_create_client_access_link(uuid,text,text,text,timestamptz) from public;
grant execute on function public.quote_create_client_access_link(uuid,text,text,text,timestamptz) to authenticated;

create or replace function public.quote_revoke_client_access_link(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select l.organization_id into v_org_id
  from public.quote_client_access_links l
  where l.id = p_link_id
    and private.has_org_role(l.organization_id, array['owner'::text,'admin'::text,'sales'::text,'technologist'::text]);
  if v_org_id is null then raise exception 'link not found or role not allowed'; end if;
  update public.quote_client_access_links set revoked_at = coalesce(revoked_at, now()) where id = p_link_id;
end;
$$;

revoke all on function public.quote_revoke_client_access_link(uuid) from public;
grant execute on function public.quote_revoke_client_access_link(uuid) to authenticated;

create or replace function public.quote_public_snapshot(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
$$;

revoke all on function public.quote_public_snapshot(text) from public;
grant execute on function public.quote_public_snapshot(text) to anon, authenticated;

create or replace function public.quote_public_respond(
  p_token_hash text,
  p_decision text,
  p_note text default null
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.quote_client_access_links%rowtype;
  v_quote public.client_commercial_quotes%rowtype;
  v_status text;
  v_note text;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid link'; end if;
  if p_decision not in ('accepted','rejected') then raise exception 'invalid decision'; end if;

  select l.* into v_link
  from public.quote_client_access_links l
  where l.token_hash = lower(p_token_hash)
    and l.revoked_at is null
    and l.expires_at > now();
  if v_link.id is null then raise exception 'link expired or revoked'; end if;

  select q.* into v_quote
  from public.client_commercial_quotes q
  where q.id = v_link.quote_id and q.organization_id = v_link.organization_id
  for update;
  if v_quote.id is null then raise exception 'quote not found'; end if;
  if v_quote.valid_until < now() then raise exception 'quote expired'; end if;

  select e.status into v_status
  from public.client_quote_status_events e
  where e.quote_id = v_quote.id and e.organization_id = v_quote.organization_id
  order by e.created_at desc, e.id desc limit 1;
  v_status := coalesce(v_status, 'approved');

  if v_status = p_decision then return v_status; end if;
  if v_status in ('accepted','rejected','expired','superseded') then raise exception 'quote has terminal status'; end if;
  if v_status not in ('approved','sent') then raise exception 'invalid quote status'; end if;

  v_note := 'Client response via secure link';
  if nullif(btrim(coalesce(p_note,'')), '') is not null then
    v_note := v_note || ' · ' || left(btrim(p_note), 500);
  end if;

  insert into public.client_quote_status_events (organization_id, quote_id, status, actor_id, note)
  values (v_quote.organization_id, v_quote.id, p_decision, null, v_note);
  return p_decision;
end;
$$;

revoke all on function public.quote_public_respond(text,text,text) from public;
grant execute on function public.quote_public_respond(text,text,text) to anon, authenticated;

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
    and private.has_org_role(q.organization_id, array['owner'::text,'admin'::text,'sales'::text,'technologist'::text]);
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
    select e.status into v_current_status from public.client_quote_status_events e
    where e.quote_id = p_quote_id and e.organization_id = v_org_id
    order by e.created_at desc, e.id desc limit 1;
    if coalesce(v_current_status,'approved') in ('approved','sent') then
      insert into public.client_quote_status_events (organization_id, quote_id, status, actor_id, note)
      values (v_org_id, p_quote_id, 'sent', auth.uid(), 'Email sent via Resend');
    end if;
  end if;

  return v_delivery_id;
end;
$$;

revoke all on function public.quote_record_email_delivery(uuid,uuid,text,text,text,text) from public;
grant execute on function public.quote_record_email_delivery(uuid,uuid,text,text,text,text) to authenticated;
