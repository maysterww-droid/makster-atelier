create or replace function public.quote_create_workspace(
  p_name text,
  p_country_code text default null,
  p_currency text default 'EUR',
  p_timezone text default 'Europe/Prague'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid := gen_random_uuid();
  v_name text := trim(coalesce(p_name, ''));
  v_country text := nullif(upper(trim(coalesce(p_country_code, ''))), '');
  v_currency text := upper(trim(coalesce(p_currency, 'EUR')));
  v_timezone text := trim(coalesce(p_timezone, 'Europe/Prague'));
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 160 then
    raise exception 'Workspace name must contain 1 to 160 characters';
  end if;
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then
    raise exception 'Invalid country code';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency code';
  end if;
  if char_length(v_timezone) < 1 or char_length(v_timezone) > 100 then
    raise exception 'Invalid timezone';
  end if;

  insert into public.organizations (
    id, name, country_code, currency, timezone, settings, created_by
  ) values (
    v_org_id, v_name, v_country, v_currency, v_timezone,
    jsonb_build_object(
      'quote', jsonb_build_object(
        'defaultDocumentLocale', 'en',
        'targetMarginBps', 3500
      )
    ),
    v_user_id
  );

  insert into public.organization_members (
    organization_id, user_id, role, status
  ) values (v_org_id, v_user_id, 'owner', 'active');

  perform private.ensure_free_quote_subscription(v_org_id);
  return v_org_id;
end;
$$;

revoke execute on function public.quote_create_workspace(text, text, text, text) from public, anon;
grant execute on function public.quote_create_workspace(text, text, text, text) to authenticated;
