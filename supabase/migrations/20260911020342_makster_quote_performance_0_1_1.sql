-- MQ 0.1.1: remove Quote-specific advisor warnings without touching unrelated legacy objects.

create index if not exists quote_cabinets_created_by_idx
  on public.quote_cabinets(created_by)
  where created_by is not null;

create index if not exists quote_cabinets_project_org_fk_idx
  on public.quote_cabinets(project_id, organization_id);

create index if not exists quote_cabinets_revision_project_org_fk_idx
  on public.quote_cabinets(project_revision_id, project_id, organization_id)
  where project_revision_id is not null;

create index if not exists quote_price_book_items_created_by_idx
  on public.quote_price_book_items(created_by)
  where created_by is not null;

drop policy if exists organization_members_insert_admin on public.organization_members;
drop policy if exists organization_members_insert_quote_bootstrap on public.organization_members;

create policy organization_members_insert_authorized
on public.organization_members for insert
to authenticated
with check (
  (select private.has_org_role(
    organization_members.organization_id,
    array['owner'::text, 'admin'::text]
  ))
  or (
    organization_members.user_id = (select auth.uid())
    and organization_members.role = 'owner'
    and organization_members.status = 'active'
    and (select private.can_claim_quote_workspace(organization_members.organization_id))
  )
);
