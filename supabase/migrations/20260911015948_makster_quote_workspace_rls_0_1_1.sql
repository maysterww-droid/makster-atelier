-- MQ 0.1.1: replace exposed SECURITY DEFINER onboarding with an RLS-governed SECURITY INVOKER flow.

alter table public.organizations
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.organizations
  alter column created_by set default auth.uid();

create index if not exists organizations_created_by_idx
  on public.organizations(created_by)
  where created_by is not null;

create or replace function private.can_create_quote_workspace()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and not exists (
      select 1 from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.status in ('active','invited')
    )
    and not exists (
      select 1 from public.organizations o
      where o.created_by = (select auth.uid())
    );
$$;

create or replace function private.can_claim_quote_workspace(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.organizations o
      where o.id = p_organization_id
        and o.created_by = (select auth.uid())
    )
    and not exists (
      select 1 from public.organization_members m
      where m.organization_id = p_organization_id
    )
    and not exists (
      select 1 from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.status in ('active','invited')
    );
$$;

create or replace function private.ensure_free_quote_subscription(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'owner'
  ) then
    raise exception 'Workspace owner authorization required';
  end if;

  insert into public.quote_subscriptions (
    organization_id, provider, plan, status, metadata_json
  ) values (
    p_organization_id, 'manual', 'free', 'active',
    jsonb_build_object('source', 'self_signup')
  ) on conflict (organization_id) do nothing;
end;
$$;

revoke execute on function private.can_create_quote_workspace() from public, anon;
revoke execute on function private.can_claim_quote_workspace(uuid) from public, anon;
revoke execute on function private.ensure_free_quote_subscription(uuid) from public, anon;
grant execute on function private.can_create_quote_workspace() to authenticated, service_role;
grant execute on function private.can_claim_quote_workspace(uuid) to authenticated, service_role;
grant execute on function private.ensure_free_quote_subscription(uuid) to authenticated, service_role;

grant insert on table public.organizations to authenticated;
grant insert on table public.organization_members to authenticated;

drop policy if exists organizations_insert_quote_bootstrap on public.organizations;
create policy organizations_insert_quote_bootstrap
on public.organizations for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.can_create_quote_workspace())
);

drop policy if exists organization_members_insert_quote_bootstrap on public.organization_members;
create policy organization_members_insert_quote_bootstrap
on public.organization_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and status = 'active'
  and (select private.can_claim_quote_workspace(organization_id))
);

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
  v_org_id uuid;
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
    name, country_code, currency, timezone, settings, created_by
  ) values (
    v_name, v_country, v_currency, v_timezone,
    jsonb_build_object(
      'quote', jsonb_build_object(
        'defaultDocumentLocale', 'en',
        'targetMarginBps', 3500
      )
    ),
    v_user_id
  ) returning id into v_org_id;

  insert into public.organization_members (
    organization_id, user_id, role, status
  ) values (v_org_id, v_user_id, 'owner', 'active');

  perform private.ensure_free_quote_subscription(v_org_id);
  return v_org_id;
end;
$$;

revoke execute on function public.quote_create_workspace(text, text, text, text) from public, anon;
grant execute on function public.quote_create_workspace(text, text, text, text) to authenticated;
