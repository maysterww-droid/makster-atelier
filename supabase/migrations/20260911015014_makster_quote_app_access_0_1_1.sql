-- MQ 0.1.1: authenticated app access, safe workspace onboarding, and repaired project bootstrap.

grant insert, update on table public.clients to authenticated;
grant insert, update on table public.projects to authenticated;
grant insert on table public.project_revisions to authenticated;
grant update on table public.organizations to authenticated;

create or replace function public.create_project_with_initial_revision(
  p_project_id uuid,
  p_organization_id uuid,
  p_name text,
  p_project_type text,
  p_currency text,
  p_snapshot jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_revision_id uuid;
  v_snapshot jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'Project snapshot must be a JSON object';
  end if;

  v_snapshot := p_snapshot || jsonb_build_object(
    'projectId', p_project_id::text,
    'revision', 1,
    'schemaVersion', '1.0.0'
  );

  insert into public.projects (
    id, organization_id, name, project_type, currency, created_by
  ) values (
    p_project_id, p_organization_id, trim(p_name), p_project_type,
    upper(p_currency), auth.uid()
  );

  insert into public.project_revisions (
    organization_id, project_id, revision_number, parent_revision_id,
    schema_version, snapshot_json, change_set_json, source, created_by
  ) values (
    p_organization_id, p_project_id, 1, null, '1.0.0', v_snapshot,
    '[]'::jsonb, 'manual', auth.uid()
  ) returning id into v_revision_id;

  update public.projects
  set current_revision_id = v_revision_id,
      updated_at = now()
  where id = p_project_id
    and organization_id = p_organization_id;

  return v_revision_id;
end;
$$;

revoke execute on function public.create_project_with_initial_revision(uuid, uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.create_project_with_initial_revision(uuid, uuid, text, text, text, jsonb) to authenticated, service_role;

create or replace function public.quote_create_workspace(
  p_name text,
  p_country_code text default null,
  p_currency text default 'EUR',
  p_timezone text default 'Europe/Prague'
)
returns uuid
language plpgsql
security definer
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

  if exists (
    select 1 from public.organization_members om
    where om.user_id = v_user_id
      and om.status in ('active', 'invited')
  ) then
    raise exception 'User already belongs to a workspace';
  end if;

  insert into public.organizations (
    name, country_code, currency, timezone, settings
  ) values (
    v_name, v_country, v_currency, v_timezone,
    jsonb_build_object(
      'quote', jsonb_build_object(
        'defaultDocumentLocale', 'en',
        'targetMarginBps', 3500
      )
    )
  ) returning id into v_org_id;

  insert into public.organization_members (
    organization_id, user_id, role, status
  ) values (v_org_id, v_user_id, 'owner', 'active');

  insert into public.quote_subscriptions (
    organization_id, provider, plan, status, metadata_json
  ) values (
    v_org_id, 'manual', 'free', 'active',
    jsonb_build_object('source', 'self_signup')
  );

  return v_org_id;
end;
$$;

revoke execute on function public.quote_create_workspace(text, text, text, text) from public, anon;
grant execute on function public.quote_create_workspace(text, text, text, text) to authenticated;
