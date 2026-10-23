create or replace function private.can_create_quote_workspace(p_organization_id uuid)
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
        and o.id <> p_organization_id
    );
$$;

revoke execute on function private.can_create_quote_workspace(uuid) from public, anon;
grant execute on function private.can_create_quote_workspace(uuid) to authenticated, service_role;

drop policy if exists organizations_insert_quote_bootstrap on public.organizations;
create policy organizations_insert_quote_bootstrap
on public.organizations for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select private.can_create_quote_workspace(id))
);
