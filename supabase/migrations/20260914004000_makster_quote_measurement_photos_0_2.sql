-- Makster Quote 0.2 Phase 1: private project-measurement photo storage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-measurements',
  'quote-measurements',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Object paths are always: <organization_id>/<project_id>/<random-file-name>.
-- Use text comparison rather than UUID casts so malformed paths simply fail RLS.
drop policy if exists quote_measurement_photos_select_org on storage.objects;
create policy quote_measurement_photos_select_org
on storage.objects for select
to authenticated
using (
  bucket_id = 'quote-measurements'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text = (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
      and om.status = 'active'
  )
);

drop policy if exists quote_measurement_photos_insert_editor on storage.objects;
create policy quote_measurement_photos_insert_editor
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'quote-measurements'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text = (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
      and om.status = 'active'
      and om.role in ('owner','admin','sales','designer','technologist')
  )
);

drop policy if exists quote_measurement_photos_update_editor on storage.objects;
create policy quote_measurement_photos_update_editor
on storage.objects for update
to authenticated
using (
  bucket_id = 'quote-measurements'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text = (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
      and om.status = 'active'
      and om.role in ('owner','admin','sales','designer','technologist')
  )
)
with check (
  bucket_id = 'quote-measurements'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text = (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
      and om.status = 'active'
      and om.role in ('owner','admin','sales','designer','technologist')
  )
);

drop policy if exists quote_measurement_photos_delete_editor on storage.objects;
create policy quote_measurement_photos_delete_editor
on storage.objects for delete
to authenticated
using (
  bucket_id = 'quote-measurements'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text = (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
      and om.status = 'active'
      and om.role in ('owner','admin','sales','designer','technologist')
  )
);
