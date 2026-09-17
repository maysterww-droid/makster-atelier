-- Makster Quote 0.2
-- Serialize publishes per project, validate commercial invariants, and supersede older active quote versions.

CREATE OR REPLACE FUNCTION public.quote_publish_commercial_snapshot(p_project_id uuid, p_client_id uuid, p_client_name text, p_currency text, p_project_revision_id uuid, p_project_revision integer, p_valid_until timestamp with time zone, p_direct_cost_minor bigint, p_overhead_minor bigint, p_total_cost_minor bigint, p_net_sales_minor bigint, p_tax_minor bigint, p_gross_sales_minor bigint, p_profit_minor bigint, p_margin_bps integer, p_markup_bps integer, p_estimate_json jsonb, p_quote_json jsonb, p_engineering_checksum text, p_pricing_fingerprint_sha256 text, p_estimate_fingerprint_sha256 text, p_quote_fingerprint_sha256 text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_org_id uuid;
  v_user_id uuid := auth.uid();
  v_project_currency text;
  v_project_client_id uuid;
  v_estimate_id uuid := gen_random_uuid();
  v_quote_id uuid := gen_random_uuid();
  v_estimate_version integer;
  v_quote_version integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select p.organization_id, p.currency, p.client_id
    into v_org_id, v_project_currency, v_project_client_id
  from public.projects p
  where p.id = p_project_id
    and private.has_org_role(p.organization_id, array['owner'::text, 'admin'::text, 'technologist'::text])
  for update;

  if v_org_id is null then
    raise exception 'project not found or role not allowed';
  end if;
  if v_project_client_id is null or p_client_id is distinct from v_project_client_id then
    raise exception 'project client mismatch';
  end if;
  if not exists (
    select 1 from public.clients c
    where c.id = p_client_id and c.organization_id = v_org_id and c.archived_at is null
  ) then
    raise exception 'client not found or archived';
  end if;
  if p_currency is distinct from v_project_currency then
    raise exception 'project currency mismatch';
  end if;
  if p_project_revision < 1 then
    raise exception 'invalid project revision';
  end if;
  if p_client_name is null or btrim(p_client_name) = '' then
    raise exception 'client name required';
  end if;
  if p_valid_until <= now() then
    raise exception 'quote validity must be in the future';
  end if;
  if p_direct_cost_minor < 0 or p_overhead_minor < 0 or p_total_cost_minor < 0
     or p_net_sales_minor < 0 or p_tax_minor < 0 or p_gross_sales_minor < 0 then
    raise exception 'negative commercial amount';
  end if;
  if p_total_cost_minor <> p_direct_cost_minor + p_overhead_minor then
    raise exception 'total cost invariant failed';
  end if;
  if p_profit_minor <> p_net_sales_minor - p_total_cost_minor then
    raise exception 'profit invariant failed';
  end if;
  if p_gross_sales_minor <> p_net_sales_minor + p_tax_minor then
    raise exception 'gross sales invariant failed';
  end if;
  if p_pricing_fingerprint_sha256 !~ '^[a-f0-9]{64}$'
     or p_estimate_fingerprint_sha256 !~ '^[a-f0-9]{64}$'
     or p_quote_fingerprint_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid fingerprint';
  end if;

  if p_quote_json->>'currency' is distinct from p_currency
     or p_quote_json#>>'{project,id}' is distinct from p_project_id::text
     or (p_quote_json#>>'{project,revisionNumber}')::integer is distinct from p_project_revision
     or p_quote_json#>>'{client,id}' is distinct from p_client_id::text
     or p_quote_json#>>'{amounts,netMinor}' is distinct from p_net_sales_minor::text
     or p_quote_json#>>'{amounts,taxMinor}' is distinct from p_tax_minor::text
     or p_quote_json#>>'{amounts,totalMinor}' is distinct from p_gross_sales_minor::text then
    raise exception 'quote snapshot invariant failed';
  end if;

  select coalesce(max(e.estimate_version), 0) + 1 into v_estimate_version
  from public.commercial_estimates e
  where e.organization_id = v_org_id and e.project_id = p_project_id;

  select coalesce(max(q.quote_version), 0) + 1 into v_quote_version
  from public.client_commercial_quotes q
  where q.organization_id = v_org_id and q.project_id = p_project_id;

  insert into public.client_quote_status_events (organization_id, quote_id, status, actor_id, note)
  select v_org_id, q.id, 'superseded', v_user_id, 'Superseded by a newer quote version'
  from public.client_commercial_quotes q
  left join lateral (
    select e.status
    from public.client_quote_status_events e
    where e.quote_id = q.id and e.organization_id = v_org_id
    order by e.created_at desc, e.id desc
    limit 1
  ) latest on true
  where q.organization_id = v_org_id
    and q.project_id = p_project_id
    and coalesce(latest.status, 'approved') in ('approved','sent');

  insert into public.commercial_estimates (
    id, organization_id, project_id, project_revision_id, project_revision,
    estimate_version, currency, pricing_profile_id, pricing_profile_fingerprint_sha256,
    engineering_input_checksum, production_pack_id, ready, estimate_fingerprint_sha256,
    direct_cost_minor, overhead_minor, total_cost_minor, net_sales_minor, tax_minor,
    gross_sales_minor, profit_minor, margin_bps, markup_bps, estimate_json, created_by
  ) values (
    v_estimate_id, v_org_id, p_project_id, p_project_revision_id, p_project_revision,
    v_estimate_version, p_currency, null, p_pricing_fingerprint_sha256,
    p_engineering_checksum, null, true, p_estimate_fingerprint_sha256,
    p_direct_cost_minor, p_overhead_minor, p_total_cost_minor, p_net_sales_minor, p_tax_minor,
    p_gross_sales_minor, p_profit_minor, p_margin_bps, p_markup_bps, p_estimate_json, v_user_id
  );

  insert into public.client_commercial_quotes (
    id, organization_id, project_id, project_revision_id, project_revision,
    estimate_id, quote_version, client_id, client_name, currency, issued_at, valid_until,
    net_amount_minor, tax_minor, total_amount_minor, quote_fingerprint_sha256, quote_json, created_by
  ) values (
    v_quote_id, v_org_id, p_project_id, p_project_revision_id, p_project_revision,
    v_estimate_id, v_quote_version, p_client_id, p_client_name, p_currency, now(), p_valid_until,
    p_net_sales_minor, p_tax_minor, p_gross_sales_minor, p_quote_fingerprint_sha256, p_quote_json, v_user_id
  );

  insert into public.client_quote_status_events (
    organization_id, quote_id, status, actor_id, note
  ) values (
    v_org_id, v_quote_id, 'approved', v_user_id, 'Published from Makster Quote'
  );

  update public.projects
  set status = case when status = 'draft' then 'quoted' else status end,
      updated_at = now()
  where id = p_project_id and organization_id = v_org_id;

  return v_quote_id;
end;
$function$;
