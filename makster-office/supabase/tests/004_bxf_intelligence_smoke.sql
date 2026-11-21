begin;

select plan(8);

select has_table('public', 'bxf_imports', 'bxf_imports exists');
select col_is_pk('public', 'bxf_imports', 'id', 'bxf_imports.id is primary key');
select has_column('public', 'bxf_imports', 'sha256', 'raw BXF sha256 is stored');
select has_column('public', 'bxf_imports', 'schema_fingerprint', 'schema fingerprint is stored');
select has_column('public', 'hardware_manufacturing_profiles', 'bxf_import_id', 'manufacturing profile points to BXF import');
select has_column('public', 'hardware_manufacturing_profiles', 'adapter_id', 'manufacturing profile stores adapter provenance');
select policies_are('public', 'bxf_imports', array['org members can read bxf imports','org editors can register bxf imports'], 'BXF RLS policies installed');
select ok((select relrowsecurity from pg_class where oid = 'public.bxf_imports'::regclass), 'RLS enabled on bxf_imports');

select * from finish();
rollback;
