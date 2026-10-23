-- MQ 0.1.13: freeze the current technical project state before commercial publication.
-- Reuses the current immutable revision when the technical snapshot has not changed.

create or replace function public.quote_freeze_project_revision(
  p_project_id uuid,
  p_snapshot jsonb,
  p_change_set jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = 'public', 'private', 'pg_temp'
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_current_revision_id uuid;
  v_current_revision_number integer;
  v_current_snapshot jsonb;
  v_candidate jsonb;
  v_revision_id uuid;
  v_revision_number integer;
  v_created boolean := false;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'project snapshot must be a JSON object';
  end if;

  if p_change_set is null or jsonb_typeof(p_change_set) not in ('array', 'object') then
    raise exception 'change set must be a JSON array or object';
  end if;

  select p.organization_id, p.current_revision_id
    into v_org_id, v_current_revision_id
  from public.projects p
  where p.id = p_project_id
    and private.has_org_role(
      p.organization_id,
      array['owner'::text, 'admin'::text, 'technologist'::text]
    )
  for update;

  if v_org_id is null then
    raise exception 'project not found or role not allowed';
  end if;

  v_candidate := p_snapshot
    || jsonb_build_object(
      'projectId', p_project_id::text,
      'schemaVersion', '1.0.0'
    );

  if v_current_revision_id is not null then
    select r.revision_number, r.snapshot_json
      into v_current_revision_number, v_current_snapshot
    from public.project_revisions r
    where r.id = v_current_revision_id
      and r.project_id = p_project_id
      and r.organization_id = v_org_id;
  end if;

  -- revision is bookkeeping, not technical content. Ignore it when deciding
  -- whether another immutable revision is necessary.
  if v_current_revision_id is not null
     and (v_current_snapshot - 'revision') = v_candidate then
    v_revision_id := v_current_revision_id;
    v_revision_number := v_current_revision_number;
  else
    insert into public.project_revisions (
      organization_id,
      project_id,
      parent_revision_id,
      snapshot_json,
      change_set_json,
      source,
      created_by
    ) values (
      v_org_id,
      p_project_id,
      v_current_revision_id,
      v_candidate,
      p_change_set,
      'system',
      v_user_id
    )
    returning id, revision_number
      into v_revision_id, v_revision_number;

    v_created := true;
  end if;

  -- All mutable working modules now belong to the technical state represented
  -- by the revision used by the next commercial snapshot.
  update public.quote_cabinets
  set project_revision_id = v_revision_id,
      updated_at = now()
  where project_id = p_project_id
    and organization_id = v_org_id
    and project_revision_id is distinct from v_revision_id;

  return jsonb_build_object(
    'id', v_revision_id,
    'revisionNumber', v_revision_number,
    'created', v_created
  );
end;
$$;

revoke execute on function public.quote_freeze_project_revision(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.quote_freeze_project_revision(uuid, jsonb, jsonb) to authenticated, service_role;
