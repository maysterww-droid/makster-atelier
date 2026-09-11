grant insert on public.commercial_estimates to authenticated;
grant insert on public.client_commercial_quotes to authenticated;
grant insert on public.client_quote_status_events to authenticated;

drop policy if exists commercial_estimates_insert_quote_author on public.commercial_estimates;
create policy commercial_estimates_insert_quote_author
on public.commercial_estimates for insert
to authenticated
with check (
  (select private.has_org_role(
    commercial_estimates.organization_id,
    array['owner'::text, 'admin'::text, 'technologist'::text]
  ))
  and commercial_estimates.created_by = (select auth.uid())
);

drop policy if exists client_commercial_quotes_insert_quote_author on public.client_commercial_quotes;
create policy client_commercial_quotes_insert_quote_author
on public.client_commercial_quotes for insert
to authenticated
with check (
  (select private.has_org_role(
    client_commercial_quotes.organization_id,
    array['owner'::text, 'admin'::text, 'technologist'::text]
  ))
  and client_commercial_quotes.created_by = (select auth.uid())
);

drop policy if exists client_quote_status_events_insert_authorized on public.client_quote_status_events;
create policy client_quote_status_events_insert_authorized
on public.client_quote_status_events for insert
to authenticated
with check (
  (select private.has_org_role(
    client_quote_status_events.organization_id,
    array['owner'::text, 'admin'::text, 'sales'::text, 'technologist'::text]
  ))
  and client_quote_status_events.actor_id = (select auth.uid())
);

create or replace function public.quote_publish_commercial_snapshot(
  p_project_id uuid,
  p_client_id uuid,
  p_client_name text,
  p_currency text,
  p_project_revision_id uuid,
  p_project_revision integer,
  p_valid_until timestamptz,
  p_direct_cost_minor bigint,
  p_overhead_minor bigint,
  p_total_cost_minor bigint,
  p_net_sales_minor bigint,
  p_tax_minor bigint,
  p_gross_sales_minor bigint,
  p_profit_minor bigint,
  p_margin_bps integer,
  p_markup_bps integer,
  p_estimate_json jsonb,
  p_quote_json jsonb,
  p_engineering_checksum text,
  p_pricing_fingerprint_sha256 text,
  p_estimate_fingerprint_sha256 text,
  p_quote_fingerprint_sha256 text
)
returns uuid
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_org_id uuid;
  v_user_id uuid := auth.uid();
  v_estimate_id uuid := gen_random_uuid();
  v_quote_id uuid := gen_random_uuid();
  v_estimate_version integer;
  v_quote_version integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select p.organization_id into v_org_id
  from public.projects p
  where p.id = p_project_id
    and private.has_org_role(p.organization_id, array['owner'::text, 'admin'::text, 'technologist'::text]);

  if v_org_id is null then
    raise exception 'project not found or role not allowed';
  end if;

  if p_project_revision < 1 then
    raise exception 'invalid project revision';
  end if;

  if p_client_name is null or btrim(p_client_name) = '' then
    raise exception 'client name required';
  end if;

  if p_pricing_fingerprint_sha256 !~ '^[a-f0-9]{64}$'
     or p_estimate_fingerprint_sha256 !~ '^[a-f0-9]{64}$'
     or p_quote_fingerprint_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid fingerprint';
  end if;

  select coalesce(max(e.estimate_version), 0) + 1 into v_estimate_version
  from public.commercial_estimates e
  where e.organization_id = v_org_id and e.project_id = p_project_id;

  select coalesce(max(q.quote_version), 0) + 1 into v_quote_version
  from public.client_commercial_quotes q
  where q.organization_id = v_org_id and q.project_id = p_project_id;

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
    v_org_id, v_quote_id, 'approved', v_user_id, 'Published from Makster Quote 0.1.4'
  );

  update public.projects
  set status = case when status = 'draft' then 'quoted' else status end,
      updated_at = now()
  where id = p_project_id and organization_id = v_org_id;

  return v_quote_id;
end;
$$;

grant execute on function public.quote_publish_commercial_snapshot(
  uuid, uuid, text, text, uuid, integer, timestamptz,
  bigint, bigint, bigint, bigint, bigint, bigint, bigint, integer, integer,
  jsonb, jsonb, text, text, text, text
) to authenticated;

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

  insert into public.client_quote_status_events (
    organization_id, quote_id, status, actor_id, note
  ) values (
    v_org_id, p_quote_id, p_status, v_user_id, nullif(btrim(coalesce(p_note, '')), '')
  );
end;
$$;

grant execute on function public.quote_append_status(uuid, text, text) to authenticated;
