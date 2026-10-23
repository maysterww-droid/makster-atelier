-- MQ 0.1.1: enforce tenant/project/revision consistency at the database layer.

alter table public.quote_cabinets
  drop constraint if exists quote_cabinets_project_id_fkey,
  drop constraint if exists quote_cabinets_project_revision_id_fkey;

alter table public.quote_cabinets
  add constraint quote_cabinets_project_org_fkey
  foreign key (project_id, organization_id)
  references public.projects(id, organization_id)
  on delete cascade;

alter table public.quote_cabinets
  add constraint quote_cabinets_revision_project_org_fkey
  foreign key (project_revision_id, project_id, organization_id)
  references public.project_revisions(id, project_id, organization_id);
