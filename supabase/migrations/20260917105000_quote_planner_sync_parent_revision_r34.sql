-- R34 hotfix: preserve the existing immutable revision chain when Planner UPDATE creates a new revision.
create or replace function public.quote_apply_planner_sync_v1(
  p_organization_id uuid,p_project_id uuid,p_handoff_id uuid,p_contract_version text,p_source_project_id text,p_source_hash text,p_sync_count integer,p_project_name text,p_currency text,p_settings jsonb,p_snapshot jsonb,p_measurement jsonb,p_cabinets jsonb,p_pricing jsonb,p_visualization jsonb
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_parent_revision_id uuid;
  v_revision_id uuid;
  v_revision_number integer;
  v_module_count integer:=0;
  v_ready_count integer:=0;
begin
  if p_organization_id is null or p_project_id is null or p_handoff_id is null then raise exception 'planner sync identifiers are required'; end if;
  select current_revision_id into v_parent_revision_id from public.projects where id=p_project_id and organization_id=p_organization_id;
  if not found then raise exception 'Quote project not found for Planner sync'; end if;

  insert into public.project_revisions(organization_id,project_id,parent_revision_id,revision_number,schema_version,snapshot_json,change_set_json,source)
  values(p_organization_id,p_project_id,v_parent_revision_id,1,'1.0.0',coalesce(p_snapshot,'{}'::jsonb),jsonb_build_array(jsonb_build_object('type','planner_sync','handoffId',p_handoff_id,'sourceHash',p_source_hash,'syncCount',p_sync_count)),'import')
  returning id,revision_number into v_revision_id,v_revision_number;

  update public.projects
  set name=left(coalesce(nullif(p_project_name,''),name),200),
      currency=coalesce(nullif(p_currency,''),currency),
      settings=coalesce(settings,'{}'::jsonb)||coalesce(p_settings,'{}'::jsonb),
      current_revision_id=v_revision_id,
      updated_at=now()
  where id=p_project_id and organization_id=p_organization_id;
  if not found then raise exception 'Quote project not found for Planner sync'; end if;

  insert into public.quote_project_measurements(organization_id,project_id,room_shape,room_height_mm,wall_a_mm,wall_b_mm,windows_text,doors_text,plumbing_text,electrical_text,appliances_text,floor_walls_text,notes,status,updated_at)
  values(p_organization_id,p_project_id,nullif(p_measurement->>'room_shape',''),nullif(p_measurement->>'room_height_mm','')::numeric,nullif(p_measurement->>'wall_a_mm','')::numeric,nullif(p_measurement->>'wall_b_mm','')::numeric,nullif(p_measurement->>'windows_text',''),nullif(p_measurement->>'doors_text',''),nullif(p_measurement->>'plumbing_text',''),nullif(p_measurement->>'electrical_text',''),nullif(p_measurement->>'appliances_text',''),nullif(p_measurement->>'floor_walls_text',''),nullif(p_measurement->>'notes',''),coalesce(nullif(p_measurement->>'status',''),'complete'),now())
  on conflict(organization_id,project_id) do update set room_shape=excluded.room_shape,room_height_mm=excluded.room_height_mm,wall_a_mm=excluded.wall_a_mm,wall_b_mm=excluded.wall_b_mm,windows_text=excluded.windows_text,doors_text=excluded.doors_text,plumbing_text=excluded.plumbing_text,electrical_text=excluded.electrical_text,appliances_text=excluded.appliances_text,floor_walls_text=excluded.floor_walls_text,notes=excluded.notes,status=excluded.status,updated_at=now();

  delete from public.quote_cabinets where organization_id=p_organization_id and project_id=p_project_id and dimension_source='planner';
  insert into public.quote_cabinets(organization_id,project_id,project_revision_id,module_key,name,sort_order,width_mm,height_mm,depth_mm,quantity,dimension_source,measurement_reference,construction_json,material_refs_json,hardware_refs_json,computed_parts_json,computed_cost_json,engine_version,updated_at)
  select p_organization_id,p_project_id,v_revision_id,c.module_key,c.name,c.sort_order,c.width_mm,c.height_mm,c.depth_mm,c.quantity,'planner',c.measurement_reference,c.construction_json,c.material_refs_json,c.hardware_refs_json,c.computed_parts_json,c.computed_cost_json,c.engine_version,now()
  from jsonb_to_recordset(coalesce(p_cabinets,'[]'::jsonb)) as c(module_key text,name text,sort_order integer,width_mm numeric,height_mm numeric,depth_mm numeric,quantity integer,measurement_reference text,construction_json jsonb,material_refs_json jsonb,hardware_refs_json jsonb,computed_parts_json jsonb,computed_cost_json jsonb,engine_version text);
  get diagnostics v_module_count=row_count;
  select count(*) into v_ready_count from public.quote_cabinets where organization_id=p_organization_id and project_id=p_project_id and dimension_source='planner' and construction_json#>>'{planner,geometryStatus}'='READY';

  insert into public.quote_planner_imports(organization_id,handoff_id,deployment_id,project_id,source_project_id,contract_version,intake_stage,status,planner_snapshot,pricing_snapshot,visualization_snapshot,latest_source_hash,sync_count,last_synced_at,updated_at)
  select p_organization_id,p_handoff_id,h.deployment_id,p_project_id,p_source_project_id,p_contract_version,'ESTIMATE_REVIEW','IMPORTED',coalesce(p_snapshot,'{}'::jsonb),coalesce(p_pricing,'{}'::jsonb),coalesce(p_visualization,'{}'::jsonb),p_source_hash,greatest(1,p_sync_count),now(),now() from public.makster_project_handoffs h where h.id=p_handoff_id and h.organization_id=p_organization_id
  on conflict(project_id) do update set handoff_id=excluded.handoff_id,deployment_id=excluded.deployment_id,source_project_id=excluded.source_project_id,contract_version=excluded.contract_version,intake_stage='ESTIMATE_REVIEW',status='IMPORTED',planner_snapshot=excluded.planner_snapshot,pricing_snapshot=excluded.pricing_snapshot,visualization_snapshot=excluded.visualization_snapshot,latest_source_hash=excluded.latest_source_hash,sync_count=excluded.sync_count,last_synced_at=now(),updated_at=now();

  return jsonb_build_object('projectId',p_project_id,'revisionId',v_revision_id,'revisionNumber',v_revision_number,'moduleCount',v_module_count,'readyGeometryCount',v_ready_count,'syncCount',greatest(1,p_sync_count));
end $$;
revoke all on function public.quote_apply_planner_sync_v1(uuid,uuid,uuid,text,text,text,integer,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.quote_apply_planner_sync_v1(uuid,uuid,uuid,text,text,text,integer,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) to service_role;
